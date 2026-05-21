import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"

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
  const kpis: any[] = kpisRes.data ?? []

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
  const inProgress = tasks.filter(t => t.status === "in_progress")
  const todo = tasks.filter(t => t.status === "todo")

  const taskLines = [
    `  - Total activas: ${tasks.length}`,
    urgentTasks.length > 0 ? `  - URGENTES: ${urgentTasks.map(t => `"${t.title}"`).join(", ")}` : null,
    inProgress.length > 0 ? `  - En progreso (${inProgress.length}): ${inProgress.slice(0, 3).map(t => `"${t.title}"`).join(", ")}` : null,
    todo.length > 0 ? `  - Por hacer: ${todo.length}` : null,
  ].filter(Boolean)

  const bizName = settings?.business_name ?? "la empresa"
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
  try {
    await requireAuth()
  } catch {
    return new Response("No autorizado", { status: 401 })
  }

  const { messages } = await req.json()
  if (!messages || !Array.isArray(messages)) {
    return new Response("Mensajes invalidos", { status: 400 })
  }

  const supabase = await createClient()
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

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  })
}
