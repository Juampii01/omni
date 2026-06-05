import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/auth/get-user"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { AGENT_TOOLS, runFindTool, buildProposal, type Proposal, type EntityKey, type Op } from "@/lib/ai/agent"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = "claude-opus-4-5"
const MAX_ITERATIONS = 6
const MAX_PROPOSALS = 12
const MAX_ATTACHMENT_B64 = 14_000_000 // ~10MB de archivo
const MAX_TEXT_CHARS = 200_000

type Attachment = { kind: "pdf" | "image" | "text"; name?: string; mediaType?: string; data?: string }

// Construye el contenido del último mensaje del usuario, embebiendo el adjunto si lo hay.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildUserContent(text: string, att?: Attachment): any {
  if (!att || !att.data) return text
  const name = att.name ?? "documento"
  if (att.kind === "text") {
    const clipped = att.data.slice(0, MAX_TEXT_CHARS)
    return `Adjunto el documento "${name}". Contenido:\n\n${clipped}\n\n---\nInstrucción: ${text || "procesá el documento y proponé las acciones que pueda cargar."}`
  }
  const blocks: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
  if (att.kind === "pdf") {
    blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: att.data } })
  } else {
    blocks.push({ type: "image", source: { type: "base64", media_type: att.mediaType ?? "image/png", data: att.data } })
  }
  blocks.push({ type: "text", text: text || `Procesá el documento adjunto "${name}" y proponé las acciones (leads, tareas, clientes, KPIs, etc.) que pueda cargar.` })
  return blocks
}

// ── Context breve del negocio ────────────────────────────────────────────────
async function getBriefContext(sb: any): Promise<{ bizName: string; ctx: string }> {
  const [{ data: settings }, { data: leads }, { count: clientsCount }, { count: tasksCount }] = await Promise.all([
    sb.from("client_settings").select("business_name, currency").single(),
    sb.from("leads").select("stage").is("deleted_at", null),
    sb.from("clients").select("id", { count: "exact", head: true }),
    sb.from("tasks").select("id", { count: "exact", head: true }).is("deleted_at", null).in("status", ["todo", "in_progress"]),
  ])
  const bizName = settings?.business_name ?? "la empresa"
  const byStage: Record<string, number> = {}
  for (const l of (leads ?? []) as any[]) byStage[l.stage] = (byStage[l.stage] ?? 0) + 1
  const ctx = [
    `Negocio: ${bizName} (moneda ${settings?.currency ?? "USD"}).`,
    `Leads por stage: ${Object.entries(byStage).map(([s, n]) => `${s}=${n}`).join(", ") || "0"}.`,
    `Clientes: ${clientsCount ?? 0}. Tareas activas: ${tasksCount ?? 0}.`,
  ].join("\n")
  return { bizName, ctx }
}

async function checkCredits(sb: any) {
  const { data } = await sb.from("client_settings").select("ai_credits_used, ai_credits_limit").single()
  const used = data?.ai_credits_used ?? 0
  const limit = data?.ai_credits_limit ?? 100_000
  return { ok: used < limit, used, limit }
}
async function incrementCredits(tokens: number) {
  try {
    const sb = (await createServiceClient()) as any
    const { data } = await sb.from("client_settings").select("ai_credits_used").single()
    await sb.from("client_settings").update({ ai_credits_used: (data?.ai_credits_used ?? 0) + tokens })
  } catch (err) { console.error("[ai/agent] incrementCredits", err) }
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try { user = await requireAuth() } catch { return new Response("No autorizado", { status: 401 }) }

  const body = await req.json()
  const { messages, conversationId: incomingConvId, attachment } = body as {
    messages: any[]; conversationId?: string; attachment?: Attachment // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  if (!messages || !Array.isArray(messages)) return new Response("Mensajes invalidos", { status: 400 })
  if (attachment?.data && attachment.data.length > MAX_ATTACHMENT_B64) {
    return Response.json({ error: "attachment_too_large", message: "El documento es muy grande (máx ~10MB)." }, { status: 413 })
  }

  const supabase = await createClient()
  const sb = supabase as any

  const credits = await checkCredits(sb)
  if (!credits.ok) {
    return Response.json({ error: "credits_exceeded", message: "Llegaste al límite de créditos de IA.", used: credits.used, limit: credits.limit }, { status: 429 })
  }

  // Conversation
  let conversationId: string | null = incomingConvId ?? null
  if (!conversationId) {
    const firstUserMsg = messages.find((m: any) => m.role === "user")
    const title = (firstUserMsg?.content ?? "Nueva conversacion").slice(0, 60).trim()
    const { data: conv } = await sb.from("ai_conversations").insert({ user_id: user.id, title, context_type: "agent" }).select("id").single()
    conversationId = conv?.id ?? null
  }
  const userMsg = messages[messages.length - 1]
  if (conversationId && userMsg?.role === "user") {
    const stored = attachment?.name ? `${userMsg.content || ""}\n\n📎 ${attachment.name}`.trim() : userMsg.content
    sb.from("ai_messages").insert({ conversation_id: conversationId, role: "user", content: stored }).then(() => {})
  }

  const { bizName, ctx } = await getBriefContext(sb)
  const today = new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  const systemPrompt = `Sos el agente operativo de IA de ${bizName}, integrado en Omni. Además de responder, podés OPERAR sobre la base de datos del negocio usando tools.

ESTADO ACTUAL:
${ctx}

REGLAS DE OPERACIÓN:
- Para crear/editar/eliminar registros usá las tools create_record / update_record / delete_record. Estas acciones NO se ejecutan al toque: se proponen y el usuario las confirma con un botón. Proponé la acción y explicá en una línea qué vas a hacer.
- NUNCA inventes IDs. Antes de editar o eliminar, usá find_records para encontrar el registro y su id real. Antes de crear algo que podría existir, chequeá con find_records para no duplicar.
- Si el usuario pide varias cosas, podés proponer varias acciones juntas.
- Si falta un dato obligatorio (ej: el nombre de un lead), pedíselo en vez de inventarlo.
- Si el usuario adjunta un documento (PDF, imagen, planilla, etc.), leelo, extraé la info estructurada y proponé las acciones para cargarla (un create_record por cada registro detectado). Si algo es ambiguo, preguntá antes de proponer.
- Respondé en español rioplatense (vos/tenés/podés), directo y accionable.
- Fecha de hoy: ${today}.`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convo: any[] = messages.map((m: any) => ({ role: m.role, content: m.content }))
  if (attachment?.data && convo.length > 0) {
    const last = convo[convo.length - 1]
    if (last.role === "user") last.content = buildUserContent(userMsg?.content ?? "", attachment)
  }
  const proposals: Proposal[] = []
  let finalText = ""
  let totalTokens = 0

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        tools: AGENT_TOOLS,
        messages: convo,
      })
      totalTokens += (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0)

      for (const block of resp.content) {
        if (block.type === "text") finalText += (finalText ? "\n" : "") + block.text
      }

      const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      if (toolUses.length === 0) break

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        const input = (tu.input ?? {}) as any
        if (tu.name === "find_records") {
          const result = await runFindTool(sb, input)
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result })
        } else {
          // write tool → proponer (no ejecutar)
          const op: Op = tu.name === "create_record" ? "create" : tu.name === "update_record" ? "update" : "delete"
          try {
            if (proposals.length >= MAX_PROPOSALS) throw new Error("Demasiadas acciones en una sola tanda.")
            const proposal = buildProposal(op, input.entity as EntityKey, { id: input.id, data: input.data })
            proposals.push(proposal)
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: `Acción propuesta y mostrada al usuario para que la confirme. Pendiente de ejecución: "${proposal.summary}". No la repitas.`,
            })
          } catch (err) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: `Error de validación: ${err instanceof Error ? err.message : "datos inválidos"}. Corregí los datos o pedile la info que falta al usuario.`,
              is_error: true,
            })
          }
        }
      }

      convo.push({ role: "assistant", content: resp.content })
      convo.push({ role: "user", content: toolResults })
    }
  } catch (err) {
    console.error("[ai/agent] loop error:", err)
    return Response.json({ error: "agent_error", message: "Error procesando la solicitud." }, { status: 500 })
  }

  if (!finalText && proposals.length > 0) {
    finalText = "Te dejé estas acciones listas para confirmar 👇"
  }

  // Persistir + créditos
  if (conversationId && finalText) {
    try {
      const svc = (await createServiceClient()) as any
      await svc.from("ai_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: finalText,
        tokens_used: totalTokens > 0 ? totalTokens : null,
        model: MODEL,
      })
      await svc.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)
    } catch (err) { console.error("[ai/agent] persist", err) }
  }
  if (totalTokens > 0) incrementCredits(totalTokens).catch(() => {})

  return Response.json({ text: finalText, proposals, conversationId })
}
