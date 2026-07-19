// Orquestador del motor de cierre: clasifica el mensaje entrante del lead,
// decide si hay que generar respuesta o escalar, corre el enforcement de
// los 3 límites duros en código (nunca solo en el prompt), y manda con
// revalidación atómica de owner justo antes del envío.

import Anthropic from "@anthropic-ai/sdk"
import { createServiceClient } from "@/lib/supabase-service"
import { buildOmniSystemPrompt, OmniContextError } from "@/lib/omni/system-prompt"
import { sendIgMessage, recordOwnSentMessage } from "@/lib/omni/instagram-send"
import { tryClaimAiSend, escalateToHuman, closeConversation, markNoCerro } from "@/lib/omni/conversation-ownership"
import { decryptToken } from "@/lib/crypto"

const MODEL = "claude-sonnet-4-5"

type ClasificacionLead = "senal_de_cierre" | "dice_que_no" | "pide_humano" | "lo_voy_a_pensar_sin_fecha" | "ninguna"

const NO_CERRO_CATEGORIAS: ClasificacionLead[] = ["dice_que_no", "pide_humano", "lo_voy_a_pensar_sin_fecha"]

/**
 * Clasificación separada del prompt de ventas en sí — es su propia llamada
 * a Claude, con su propio prompt angosto, sin el system prompt de cierre
 * (que empuja a "avanzar la venta" y podría sesgar la clasificación hacia
 * no detectar un "no"). Tool forzado en vez de JSON-en-texto: la salida
 * tiene que venir en una de las 5 categorías fijas, no hay margen de
 * interpretación de parseo.
 */
async function classifyLeadMessage(apiKey: string, leadMessage: string, recentContext: string): Promise<ClasificacionLead> {
  const anthropic = new Anthropic({ apiKey })

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system:
      "Clasificás UN mensaje de un lead dentro de una conversación de ventas por Instagram. No generás respuesta de ventas, solo clasificás. Categorías, en este orden de prioridad si más de una podría aplicar:\n" +
      "- senal_de_cierre: dice explícitamente que quiere pagar o arrancar ahora (ej. 'sí, quiero pagar', 'dale, cómo hago para arrancar'). No alcanza con sonar interesado o que la conversación vaya bien.\n" +
      "- dice_que_no: rechaza explícitamente, sin ambigüedad.\n" +
      "- pide_humano: pide hablar con una persona real / con el equipo directamente.\n" +
      "- lo_voy_a_pensar_sin_fecha: dice que lo va a pensar, evaluar, consultar, etc. SIN dar una fecha o momento concreto de cuándo retoma. Si SÍ da una fecha concreta ('te digo el lunes'), es 'ninguna' — no se corta la conversación por eso.\n" +
      "- ninguna: cualquier otra cosa (pregunta, objeción, avanza la conversación con normalidad).",
    tools: [
      {
        name: "classify_message",
        description: "Clasifica el mensaje del lead en una de las 5 categorías fijas.",
        input_schema: {
          type: "object",
          properties: {
            categoria: {
              type: "string",
              enum: ["senal_de_cierre", "dice_que_no", "pide_humano", "lo_voy_a_pensar_sin_fecha", "ninguna"],
            },
            razon: { type: "string", description: "una frase corta de por qué" },
          },
          required: ["categoria", "razon"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "classify_message" },
    messages: [
      {
        role: "user",
        content: `Contexto reciente de la conversación (últimos mensajes, más viejo primero):\n${recentContext}\n\nMensaje del lead a clasificar:\n"${leadMessage}"`,
      },
    ],
  })

  const toolUse = msg.content.find((b) => b.type === "tool_use")
  if (toolUse?.type !== "tool_use") throw new Error("El clasificador no devolvió una clasificación estructurada")
  const input = toolUse.input as { categoria: ClasificacionLead }
  return input.categoria
}

// ============================================================================
// Enforcement en código de los 3 límites duros — corre SIEMPRE sobre la
// respuesta generada, antes de mandarla. Si algo de esto falla, la
// respuesta NO se manda, sin excepción — la única salida es escalar a
// humano. Esto es la defensa real; el prompt (capa 1 + límites duros en el
// texto) es la primera línea, no la única.
// ============================================================================

interface AuthorizedPricingEntry { amount?: string | number }

const GUARANTEE_PATTERNS = [
  /te garantizo/i,
  /garantizado/i,
  /vas a (lograr|conseguir|ganar|facturar).{0,20}(seguro|si o si|sí o sí)/i,
  /(100|cien)\s?%\s?(seguro|garantizado)/i,
  /sin ninguna duda vas a/i,
  /asegurado que/i,
]

// Heurística débil a propósito, y lo dejamos documentado como tal: "no
// inventar disponibilidad/bonos" es el límite más difícil de chequear con
// patrones fijos porque no es una lista cerrada de frases prohibidas. Esto
// atrapa menciones de estos conceptos que no tengan respaldo en
// authorized_pricing, pero no es exhaustivo — un caso raro puede pasar.
const AVAILABILITY_KEYWORDS = [/\bbono(s)?\b/i, /\bcupo(s)?\b/i, /\bdisponibilidad\b/i, /\bdescuento(s)?\b/i, /\boferta\b/i]

function extractMoneyMentions(text: string): string[] {
  const matches = text.match(/\$\s?\d[\d.,]*|(?:\d[\d.,]*)\s?(?:usd|ars|pesos|dólares|dolares)/gi) ?? []
  return matches.map((m) => m.trim())
}

export interface HardLimitCheck {
  ok: boolean
  violations: string[]
}

export function checkHardLimits(responseText: string, authorizedPricing: AuthorizedPricingEntry[]): HardLimitCheck {
  const violations: string[] = []

  const mentionedAmounts = extractMoneyMentions(responseText)
  const authorizedAmounts = new Set(authorizedPricing.map((p) => String(p.amount ?? "").replace(/[.,\s]/g, "")))
  for (const mention of mentionedAmounts) {
    const normalized = mention.replace(/[^\d]/g, "")
    if (normalized && !authorizedAmounts.has(normalized)) {
      violations.push(`Precio/monto no autorizado mencionado: "${mention}"`)
    }
  }

  for (const pattern of GUARANTEE_PATTERNS) {
    if (pattern.test(responseText)) {
      violations.push(`Lenguaje de garantía de resultado detectado: patrón "${pattern.source}"`)
    }
  }

  for (const pattern of AVAILABILITY_KEYWORDS) {
    if (pattern.test(responseText)) {
      violations.push(`Mención de disponibilidad/bono/descuento — revisar si está autorizado: patrón "${pattern.source}"`)
    }
  }

  return { ok: violations.length === 0, violations }
}

// ============================================================================
// Orquestador principal — se llama desde el webhook handler cuando llega un
// mensaje nuevo del lead con owner='ia_activa'.
// ============================================================================

interface ConversationStateRow {
  id: string
  client_id: string
  conversation_id: string
  instagram_user_id: string
  owner: string
}

export async function processIncomingLeadMessage(state: ConversationStateRow): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error("[closing-engine] Falta ANTHROPIC_API_KEY — no se puede procesar el mensaje entrante")
    return
  }

  const supabase = createServiceClient()

  // El historial completo del conversation_id incluye mensajes de ciclos
  // anteriores (si esta fila es un ciclo nuevo tras un cierre previo) — no
  // hace falta lógica extra de "traer también las filas viejas", ya está
  // cubierto porque instagram_messages se scopea por conversation_id, no
  // por state.id.
  const { data: messages, error: messagesError } = await supabase
    .from("instagram_messages")
    .select("sender, body, sent_at")
    .eq("conversation_id", state.conversation_id)
    .order("sent_at", { ascending: true })
    .limit(100)

  if (messagesError) {
    console.error(`[closing-engine] Error leyendo historial: ${messagesError.message}`)
    return
  }

  const history = messages ?? []
  const lastLeadMessage = [...history].reverse().find((m) => m.sender === "lead")
  if (!lastLeadMessage?.body) return

  const recentContext = history
    .slice(-10)
    .map((m) => `${m.sender === "lead" ? "Lead" : "Nosotros"}: ${m.body}`)
    .join("\n")

  let categoria: ClasificacionLead
  try {
    categoria = await classifyLeadMessage(apiKey, lastLeadMessage.body, recentContext)
  } catch (e) {
    console.error(`[closing-engine] Error clasificando mensaje: ${e instanceof Error ? e.message : e}`)
    return
  }

  if (categoria === "senal_de_cierre") {
    await generateAndSend(state, apiKey, recentContext, { onSentEtapa: "cerrado_pendiente_cobro" })
    return
  }

  if (NO_CERRO_CATEGORIAS.includes(categoria)) {
    await markNoCerro(state.id)
    await escalateToHuman(state.id, "no_cerro")
    // Fase 1: placeholder — la integración real de WhatsApp se conecta
    // después, a pedido explícito.
    console.log(
      `[closing-engine][ALERTA WHATSAPP - PLACEHOLDER] client_id=${state.client_id} conversation_id=${state.conversation_id} motivo=${categoria}`
    )
    return
  }

  // categoria === "ninguna" — sigue la conversación con normalidad.
  await generateAndSend(state, apiKey, recentContext, {})
}

async function generateAndSend(
  state: ConversationStateRow,
  apiKey: string,
  recentContext: string,
  opts: { onSentEtapa?: "cerrado_pendiente_cobro" }
): Promise<void> {
  const supabase = createServiceClient()

  let systemPrompt: string
  try {
    systemPrompt = await buildOmniSystemPrompt(state.client_id, "cierre")
  } catch (e) {
    console.error(`[closing-engine] ${e instanceof OmniContextError ? "Contexto incompleto" : "Error armando prompt"}: ${e instanceof Error ? e.message : e}`)
    await escalateToHuman(state.id, "limite_duro")
    return
  }

  const anthropic = new Anthropic({ apiKey })
  let responseText: string
  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: `Conversación hasta ahora:\n${recentContext}\n\nGenerá tu próximo mensaje al lead.` }],
    })
    const block = msg.content.find((b) => b.type === "text")
    responseText = block?.type === "text" ? block.text.trim() : ""
  } catch (e) {
    console.error(`[closing-engine] Error generando respuesta: ${e instanceof Error ? e.message : e}`)
    return
  }

  if (!responseText) return

  const { data: config } = await supabase.from("client_config").select("authorized_pricing, ig_access_token").eq("client_id", state.client_id).maybeSingle()
  const authorizedPricing = (config?.authorized_pricing as { amount?: string | number }[] | null) ?? []

  const check = checkHardLimits(responseText, authorizedPricing)
  if (!check.ok) {
    console.error(`[closing-engine] Límite duro violado, NO se manda. client_id=${state.client_id} conversation_id=${state.conversation_id}: ${check.violations.join(" | ")}`)
    await escalateToHuman(state.id, "limite_duro")
    return
  }

  if (!config?.ig_access_token) {
    console.error(`[closing-engine] Sin ig_access_token para client_id=${state.client_id} — no se puede enviar`)
    await escalateToHuman(state.id, "limite_duro")
    return
  }

  // Revalidación atómica: si owner cambió entre que arrancamos a generar
  // (arriba) y ahora, esto devuelve false y NO mandamos — se descarta la
  // respuesta ya generada, tal como se pidió explícitamente.
  const claimed = await tryClaimAiSend(state.id)
  if (!claimed) {
    console.log(`[closing-engine] owner cambió durante la generación, se descarta la respuesta. state_id=${state.id}`)
    return
  }

  const { data: conv } = await supabase.from("instagram_conversations").select("participant_ig_id").eq("id", state.conversation_id).maybeSingle()
  if (!conv?.participant_ig_id) {
    console.error(`[closing-engine] Conversación sin participant_ig_id, no se puede enviar. conversation_id=${state.conversation_id}`)
    return
  }

  try {
    const accessToken = decryptToken(config.ig_access_token)
    const sent = await sendIgMessage(accessToken, conv.participant_ig_id, responseText)
    await recordOwnSentMessage(sent.id, state.client_id, state.conversation_id)
    // El mensaje YA se mandó por Instagram — un error acá no lo revierte, así
    // que no lo tratamos como "error enviando mensaje" (eso saltearía el
    // closeConversation de más abajo por un fallo que no tiene nada que ver
    // con si el negocio se cerró). Mismo criterio que ya usa
    // recordOwnSentMessage arriba.
    const { error: historyError } = await supabase.from("instagram_messages").insert({
      conversation_id: state.conversation_id,
      ig_message_id: sent.id,
      sender: "client",
      body: responseText,
      sent_at: new Date().toISOString(),
    })
    if (historyError) {
      console.error(`[closing-engine] Mensaje enviado (ig_message_id=${sent.id}) pero no se pudo guardar en instagram_messages — el historial va a faltar este mensaje en el próximo turno: ${historyError.message}`)
    }
  } catch (e) {
    console.error(`[closing-engine] Error enviando mensaje: ${e instanceof Error ? e.message : e}`)
    return
  }

  if (opts.onSentEtapa) {
    const closed = await closeConversation(state.id, opts.onSentEtapa)
    if (!closed) {
      console.log(`[closing-engine] Cierre no aplicado — owner ya no era ia_activa, probablemente un humano tomó control en el medio. state_id=${state.id}`)
    }
  }
}
