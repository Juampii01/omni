// Detección de workflows "por horario" (trigger_type = 'schedule.due') —
// se engancha en el cron que ya existe (process-automations), no pide un
// slot de cron nuevo. trigger_config guarda {dayOfWeek, hour, timezone?},
// campos simples en vez de sintaxis cron, para que sea fácil armar un
// selector de UI. "Vencido" encola directo en automation_events (mismo shape
// que emitOmniEvent, pero en un solo insert masivo para todos los workflows
// vencidos de esta pasada) — nunca ejecuta los steps acá directo.
import { createServiceClient } from "@/lib/supabase-service"

const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires"
const MIN_HOURS_BETWEEN_FIRES = 20

const WEEKDAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function getLocalWeekdayAndHour(timeZone: string): { weekday: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", hour12: false }).formatToParts(new Date())
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Sun"
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0"

  // hour12:false puede devolver "24" para medianoche en algunos entornos ICU.
  let hour = parseInt(hourStr, 10)
  if (hour === 24) hour = 0

  return { weekday: WEEKDAY_MAP[weekdayStr] ?? 0, hour }
}

type ScheduleConfig = { dayOfWeek?: number; hour?: number; timezone?: string }

export async function scanAndEnqueueDueSchedules(): Promise<{ scanned: number; enqueued: number }> {
  const supabase = createServiceClient()
  const { data: workflows, error } = await supabase
    .from("automation_workflows")
    .select("id, client_id, trigger_config, last_triggered_at")
    .eq("trigger_type", "schedule.due")
    .eq("is_active", true)

  if (error) throw new Error(error.message)

  const due: Array<{ id: string; client_id: string }> = []
  for (const workflow of workflows ?? []) {
    const config = (workflow.trigger_config as ScheduleConfig) ?? {}
    if (config.dayOfWeek == null || config.hour == null) continue

    const { weekday, hour } = getLocalWeekdayAndHour(config.timezone ?? DEFAULT_TIMEZONE)
    if (weekday !== config.dayOfWeek || hour !== config.hour) continue

    if (workflow.last_triggered_at) {
      const hoursSince = (Date.now() - new Date(workflow.last_triggered_at).getTime()) / (60 * 60 * 1000)
      if (hoursSince < MIN_HOURS_BETWEEN_FIRES) continue
    }

    due.push({ id: workflow.id, client_id: workflow.client_id })
  }

  if (due.length === 0) return { scanned: workflows?.length ?? 0, enqueued: 0 }

  const { error: eventsError } = await supabase
    .from("automation_events")
    .insert(due.map((w) => ({ client_id: w.client_id, event_type: "schedule.due", payload: { workflowId: w.id } })))

  if (eventsError) {
    console.error(`[automation-schedule] no se pudieron encolar ${due.length} evento(s) schedule.due:`, eventsError.message)
    return { scanned: workflows?.length ?? 0, enqueued: 0 }
  }

  const { error: updateError } = await supabase
    .from("automation_workflows")
    .update({ last_triggered_at: new Date().toISOString() })
    .in(
      "id",
      due.map((w) => w.id)
    )
  if (updateError) console.error(`[automation-schedule] no se pudo actualizar last_triggered_at para ${due.length} workflow(s):`, updateError.message)

  return { scanned: workflows?.length ?? 0, enqueued: due.length }
}
