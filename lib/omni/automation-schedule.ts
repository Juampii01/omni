// Detección de workflows "por horario" (trigger_type = 'schedule.due') —
// se engancha en el cron que ya existe (process-automations), no pide un
// slot de cron nuevo. trigger_config guarda {dayOfWeek, hour, timezone?},
// campos simples en vez de sintaxis cron, para que sea fácil armar un
// selector de UI. "Vencido" se resuelve reusando el mismo motor de eventos
// ya construido (emitOmniEvent) — nunca ejecuta los steps acá directo.
import { createServiceClient } from "@/lib/supabase-service"
import { emitOmniEvent } from "@/lib/omni/automation-events"

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

  let enqueued = 0
  for (const workflow of workflows ?? []) {
    const config = (workflow.trigger_config as ScheduleConfig) ?? {}
    if (config.dayOfWeek == null || config.hour == null) continue

    const { weekday, hour } = getLocalWeekdayAndHour(config.timezone ?? DEFAULT_TIMEZONE)
    if (weekday !== config.dayOfWeek || hour !== config.hour) continue

    if (workflow.last_triggered_at) {
      const hoursSince = (Date.now() - new Date(workflow.last_triggered_at).getTime()) / (60 * 60 * 1000)
      if (hoursSince < MIN_HOURS_BETWEEN_FIRES) continue
    }

    await emitOmniEvent(workflow.client_id, "schedule.due", { workflowId: workflow.id })
    await supabase.from("automation_workflows").update({ last_triggered_at: new Date().toISOString() }).eq("id", workflow.id)
    enqueued++
  }

  return { scanned: workflows?.length ?? 0, enqueued }
}
