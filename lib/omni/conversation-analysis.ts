// Análisis individual de una conversación de Instagram, bajo demanda — a
// diferencia del análisis masivo de prospección (que filtra a "solo
// riesgos"), esto SIEMPRE devuelve un veredicto, incluyendo "sano" cuando
// no hay nada preocupante. Portado del piloto de Ann (Smart-Scale).

import { createServiceClient } from "@/lib/supabase-service"
import { buildOmniSystemPrompt } from "@/lib/omni/system-prompt"
import Anthropic from "@anthropic-ai/sdk"

const MESSAGES_LIMIT = 60

export interface ConversationAnalysisResult {
  estado: "sano" | "en_riesgo" | "irremontable"
  situacion: string
  principio: string
  evidencia: string
  accion: string
  severidad: "alta" | "media" | "baja"
}

export class ConversationAnalysisError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function runConversationAnalysis(clientId: string, conversationId: string): Promise<ConversationAnalysisResult> {
  if (!clientId || !conversationId) throw new ConversationAnalysisError("client_id y conversationId son obligatorios", 400)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new ConversationAnalysisError("Falta ANTHROPIC_API_KEY en el servidor", 503)

  let systemPrompt: string
  try {
    systemPrompt = await buildOmniSystemPrompt(clientId)
  } catch (e) {
    throw new ConversationAnalysisError(e instanceof Error ? e.message : "Error armando el contexto de Omni", 500)
  }

  const supabase = createServiceClient()

  const { data: conversation, error: convError } = await supabase
    .from("instagram_conversations")
    .select("id, client_id, participant_username")
    .eq("id", conversationId)
    .eq("client_id", clientId)
    .maybeSingle()

  if (convError) throw new ConversationAnalysisError(convError.message, 500)
  if (!conversation) throw new ConversationAnalysisError("Conversación no encontrada", 404)
  if (conversation.client_id !== clientId) {
    throw new ConversationAnalysisError(`Aislamiento violado: conversación pertenece a client_id=${conversation.client_id}`, 500)
  }

  const { data: messages, error: msgError } = await supabase
    .from("instagram_messages")
    .select("sender, body, sent_at")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: true })
    .limit(MESSAGES_LIMIT)

  if (msgError) throw new ConversationAnalysisError(msgError.message, 500)
  if (!messages || messages.length === 0) throw new ConversationAnalysisError("La conversación no tiene mensajes sincronizados todavía.", 400)

  const username = conversation.participant_username ?? "(desconocido)"
  const { data: lead } = await supabase
    .from("leads")
    .select("rating, niche, notes, purchased")
    .eq("client_id", clientId)
    .eq("instagram", username)
    .maybeSingle()

  const transcript = messages.map((m) => `${m.sender === "client" ? "vos" : username}: ${m.body ?? ""}`).join("\n")

  const prompt = `Te paso la conversación completa de Instagram con @${username}. Evaluála contra tu criterio y devolvé SIEMPRE un veredicto — no la filtres, aunque esté sana.

${lead ? `Datos del lead: ${JSON.stringify({ rating: lead.rating, nicho: lead.niche, notas: lead.notes, compro: lead.purchased })}` : "(sin datos de lead cargados)"}

CONVERSACIÓN:
${transcript}

Devolvé un único objeto JSON (no un array) con:
- "estado": "sano" (avanza normalmente, sin señales de alarma) | "en_riesgo" (hay una señal concreta pero todavía se puede recuperar con una acción) | "irremontable" (ya se perdió, no hay acción razonable)
- "situacion": 1-2 oraciones describiendo qué está pasando, en base a la conversación real
- "principio": qué principio del framework aplica acá (si está sano, qué principio se está cumpliendo bien)
- "evidencia": una cita corta y concreta de la conversación que sustenta el veredicto
- "accion": qué hacer distinto (si está sano, puede ser "ninguna, seguir así" o similar)
- "severidad": "alta" | "media" | "baja"

Respondé SOLO con el JSON. Sin markdown, sin texto adicional.`

  const anthropic = new Anthropic({ apiKey })
  let msg
  try {
    msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    })
  } catch (e) {
    throw new ConversationAnalysisError(`Error llamando a Claude: ${e instanceof Error ? e.message : "unknown"}`, 502)
  }

  const raw = msg.content.find((b) => b.type === "text")
  const text = raw?.type === "text" ? raw.text.trim() : "{}"
  const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()

  let result: ConversationAnalysisResult
  try {
    result = JSON.parse(cleaned)
  } catch (e) {
    console.error("[omni/conversation-analysis] parse error:", e instanceof Error ? e.message : e, cleaned.slice(0, 300))
    throw new ConversationAnalysisError("Claude devolvió una respuesta que no se pudo interpretar", 502)
  }

  const { error: upsertError } = await supabase.from("conversation_analyses").upsert({
    conversation_id: conversationId,
    client_id: clientId,
    estado: result.estado,
    situacion: result.situacion,
    principio: result.principio,
    evidencia: result.evidencia,
    accion: result.accion,
    severidad: result.severidad,
    analyzed_at: new Date().toISOString(),
  })
  if (upsertError) throw new ConversationAnalysisError(upsertError.message, 500)

  return result
}
