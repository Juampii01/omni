import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/auth/get-user"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Dashboard context fetcher ─────────────────────────────────────────────────

async function getDashboardContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const sb = supabase as any

  const [settingsRes, leadsRes, tasksRes, kpisRes] = await Promise.all([
    sb.from("client_settings").select("business_name, currency, timezone").single(),
    sb.from("leads").select("stage, amount").is("deleted_at", null),
    sb.from("tasks").select("status, priority, title").is("deleted_at", null).neq("status", "done").neq("status", "cancelled").order("created_at", { ascending: false }).limit(20),
    sb.from("kpis").select("metric_name, metric_value, metric_target, unit, period_month, category").order("period_month", { ascending: false }).limit(30),
  ])

  const settings = settingsRes.data
  const leads: any[] = leadsRes.data ?? []
  const tasks: any[] = tasksRes.data ?? []
  const kpis:  any[] = kpisRes.data ?? []

  const STAGE_LABELS: Record<string, string> = {
    new: "Nuevos", qualified: "Calificados", meeting_scheduled: "Reunion agendada",
    meeting_done: "Reunion realizada", proposal_sent: "Propuesta enviada",
    negotiation: "Negociacion", won: "Cerrados (Won)", lost: "Perdidos",
  }

  const byStage: Record<string, { count: number; value: number }> = {}
  let totalValue = 0
  for (const lead of leads) {
    if (!byStage[lead.stage]) byStage[lead.stage] = { count: 0, value: 0 }
    byStage[lead.stage].count++
    byStage[lead.stage].value += Number(lead.amount ?? 0)
    if (lead.stage !== "lost") totalValue += Number(lead.amount ?? 0)
  }

  const leadsLines = Object.entries(byStage).map(([stage, d]) => {
    const label = STAGE_LABELS[stage] ?? stage
    const val = d.value > 0 ? ` ($${d.value.toLocaleString("en-US")})` : ""
    return `  - ${label}: ${d.count} lead${d.count !== 1 ? "s" : ""}${val}`
  })
  const activeLeads = leads.filter(l => !["won", "lost"].includes(l.stage)).length

  const latestByMetric: Record<string, any> = {}
  for (const kpi of kpis) {
    if (!latestByMetric[kpi.metric_name] || kpi.period_month > latestByMetric[kpi.metric_name].period_month) {
      latestByMetric[kpi.metric_name] = kpi
    }
  }

  function fmtVal(value: number | null, unit: string | null) {
    if (value == null) return "-"
    const u = (unit ?? "").toLowerCase()
    if (u === "usd") return `$${value.toLocaleString("en-US")}`
    if (u === "percent") return `${value}%`
    return `${value}${unit ? ` ${unit}` : ""}`
  }

  const kpiLines = Object.values(latestByMetric).map((k: any) => {
    const target = k.metric_target != null ? ` (meta: ${fmtVal(k.metric_target, k.unit)})` : ""
    const period = new Date(k.period_month).toLocaleString("es-AR", { month: "long", year: "numeric" })
    return `  - ${k.metric_name}: ${fmtVal(k.metric_value, k.unit)}${target} [${period}]`
  })

  const urgentTasks = tasks.filter(t => t.priority === "urgent")
  const inProgress  = tasks.filter(t => t.status === "in_progress")
  const todo        = tasks.filter(t => t.status === "todo")

  const taskLines = [
    `  - Total activas: ${tasks.length}`,
    urgentTasks.length > 0 ? `  - URGENTES: ${urgentTasks.map(t => `"${t.title}"`).join(", ")}` : null,
    inProgress.length  > 0 ? `  - En progreso (${inProgress.length}): ${inProgress.slice(0, 3).map(t => `"${t.title}"`).join(", ")}` : null,
    todo.length        > 0 ? `  - Por hacer: ${todo.length}` : null,
  ].filter(Boolean)

  const bizName  = settings?.business_name ?? "la empresa"
  const currency = settings?.currency ?? "USD"

  const ctx = [
    `=== CONTEXTO REAL DEL NEGOCIO: ${bizName} ===`,
    ``,
    `PIPELINE (${leads.length} leads totales, ${activeLeads} activos):`,
    ...leadsLines,
    `  -> Valor total del pipeline activo: $${totalValue.toLocaleString("en-US")} ${currency}`,
    ``,
    `KPIs (ultimo dato disponible por metrica):`,
    ...kpiLines,
    ``,
    `TAREAS PENDIENTES:`,
    ...taskLines,
    ``,
    `=== FIN CONTEXTO ===`,
  ].join("\n")

  return { bizName, ctx }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try {
    user = await requireAuth()
  } catch {
    return new Response("No autorizado", { status: 401 })
  }

  const body = await req.json()
  const { messages, conversationId: incomingConvId } = body

  if (!messages || !Array.isArray(messages)) {
    return new Response("Mensajes invalidos", { status: 400 })
  }

  const supabase = await createClient()
  const sb = supabase as any

  // ── Credits check ─────────────────────────────────────────────────────────
  const { data: credits } = await sb
    .from("client_settings")
    .select("ai_credits_used, ai_credits_limit")
    .single()

  const used  = credits?.ai_credits_used  ?? 0
  const limit = credits?.ai_credits_limit ?? 100_000

  if (used >= limit) {
    return Response.json(
      {
        error:   "credits_exceeded",
        message: "Llegaste al límite de créditos de IA para este período. Contactá a tu admin para aumentarlo.",
        used,
        limit,
      },
      { status: 429 }
    )
  }

  // ── Get or create conversation ─────────────────────────────────────────────
  let conversationId: string | null = incomingConvId ?? null

  if (!conversationId) {
    // Title = primeros 60 chars del primer mensaje del usuario
    const firstUserMsg = messages.find((m: any) => m.role === "user")
    const title = (firstUserMsg?.content ?? "Nueva conversación").slice(0, 60).trim()

    const { data: conv, error: convError } = await sb
      .from("ai_conversations")
      .insert({ user_id: user.id, title, context_type: "general" })
      .select("id")
      .single()

    if (convError) {
      console.error("[ai/chat] Failed to create conversation:", convError)
    } else {
      conversationId = conv?.id ?? null
    }
  } else {
    // Validate that this conversation belongs to the current user
    const { data: conv } = await sb
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .single()

    if (!conv) {
      return new Response("Conversación no encontrada", { status: 404 })
    }
  }

  // ── Save user message ──────────────────────────────────────────────────────
  const userMsg = messages[messages.length - 1]
  if (conversationId && userMsg?.role === "user") {
    sb.from("ai_messages")
      .insert({ conversation_id: conversationId, role: "user", content: userMsg.content })
      .then(({ error }: any) => {
        if (error) console.error("[ai/chat] Failed to save user message:", error)
      })
  }

  // ── Build context + prompt ─────────────────────────────────────────────────
  const { bizName, ctx } = await getDashboardContext(supabase)

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })

  const systemPrompt = `Sos el asistente de IA de ${bizName}, integrado en Omni (sistema operativo del negocio).

Tenes acceso en tiempo real al estado actual del negocio. Cuando te pregunten por datos, usa el contexto.

${ctx}

INSTRUCCIONES:
- Respondé siempre en español rioplatense. Usá "vos", "tenés", "podés".
- Sé directo y accionable. Evitá intro largas.
- Cuando des recomendaciones, basate en los datos reales del contexto.
- Usá **negrita** para resaltar, listas con - cuando haya múltiples items, y código con backticks si aplica.
- Si no tenés el dato exacto, decilo claramente pero ayudá igual.
- Actuá como un consultor senior que conoce la empresa a fondo.
- Fecha de hoy: ${today}`

  // ── Stream response ────────────────────────────────────────────────────────
  const stream = anthropic.messages.stream({
    model:      "claude-opus-4-5",
    max_tokens: 1024,
    system:     systemPrompt,
    messages:   messages.map((m: any) => ({ role: m.role, content: m.content })),
  })

  const encoder = new TextEncoder()
  let inputTokens     = 0
  let outputTokens    = 0
  let accumulatedText = ""

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          // Capture token usage from stream events
          if (chunk.type === "message_start") {
            inputTokens = chunk.message.usage?.input_tokens ?? 0
          }
          if (chunk.type === "message_delta" && (chunk as any).usage) {
            outputTokens = (chunk as any).usage.output_tokens ?? 0
          }
          // Accumulate and stream text to client
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            accumulatedText += chunk.delta.text
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()

        const tokensUsed = inputTokens + outputTokens

        // Fire-and-forget: save assistant message + update conversation timestamp
        if (conversationId && accumulatedText) {
          persistAssistantMessage(conversationId, accumulatedText, tokensUsed).catch(err =>
            console.error("[ai/chat] Failed to persist assistant message:", err)
          )
        }

        // Fire-and-forget: increment credits counter
        if (tokensUsed > 0) {
          updateCredits(tokensUsed).catch(err =>
            console.error("[ai/chat] Failed to update credits:", err)
          )
        }
      }
    },
  })

  const responseHeaders: Record<string, string> = {
    "Content-Type":      "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
    "Cache-Control":     "no-cache",
  }

  if (conversationId) {
    responseHeaders["X-Conversation-Id"]          = conversationId
    responseHeaders["Access-Control-Expose-Headers"] = "X-Conversation-Id"
  }

  return new Response(readable, { headers: responseHeaders })
}

// ── Persist assistant message + bump conversation updated_at ──────────────────

async function persistAssistantMessage(
  conversationId: string,
  content: string,
  tokensUsed: number,
) {
  try {
    const sb = await createServiceClient() as any
    await sb
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role:            "assistant",
        content,
        tokens_used:     tokensUsed > 0 ? tokensUsed : null,
        model:           "claude-opus-4-5",
      })
    // Bump updated_at so it appears first in the sidebar list
    await sb
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
  } catch (err) {
    console.error("[ai/chat] persistAssistantMessage error:", err)
  }
}

// ── Credit update (service role to bypass RLS) ────────────────────────────────

async function updateCredits(tokensUsed: number) {
  try {
    const sb = await createServiceClient() as any
    const { data } = await sb
      .from("client_settings")
      .select("ai_credits_used")
      .single()

    const current = data?.ai_credits_used ?? 0
    await sb
      .from("client_settings")
      .update({ ai_credits_used: current + tokensUsed })
  } catch (err) {
    console.error("[ai/chat] Credit update error:", err)
  }
}
