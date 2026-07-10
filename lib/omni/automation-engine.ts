// Procesa UN evento de la cola: busca los workflows activos de ese
// client_id + trigger_type que matcheen el trigger_config, corre sus
// steps en orden, y deja un automation_runs con el log — para que el
// usuario pueda confirmar que algo realmente pasó, no solo confiar a
// ciegas en que la automatización "debería" haber corrido.
import { createServiceClient } from "@/lib/supabase-service"
import { executeAction } from "@/lib/omni/automation-actions"

const SEVERIDAD_ORDER: Record<string, number> = { baja: 0, media: 1, alta: 2 }

export interface AutomationEvent {
  id: string
  client_id: string
  event_type: string
  payload: Record<string, unknown>
}

function matchesTrigger(workflowId: string, eventType: string, payload: Record<string, unknown>, triggerConfig: Record<string, unknown>): boolean {
  if (eventType === "webhook.incoming") {
    // El evento ya viene dirigido a UN workflow puntual (por la URL del
    // webhook) — nunca "todos los workflows de webhook de este cliente".
    return payload.workflowId === workflowId
  }

  if (eventType === "briefing.finding") {
    if (triggerConfig.briefingType && triggerConfig.briefingType !== payload.type) return false
    if (triggerConfig.minSeveridad) {
      const findings = (payload.findings as Array<{ severidad?: string }>) ?? []
      const maxSeveridad = findings.reduce((max, f) => Math.max(max, SEVERIDAD_ORDER[f.severidad ?? "baja"] ?? 0), 0)
      const minRequired = SEVERIDAD_ORDER[triggerConfig.minSeveridad as string] ?? 0
      if (maxSeveridad < minRequired) return false
    }
    return true
  }

  if (eventType === "task.column_changed") {
    if (triggerConfig.columnId && triggerConfig.columnId !== payload.columnId) return false
    return true
  }

  return false
}

export async function processAutomationEvent(event: AutomationEvent) {
  const supabase = createServiceClient()

  const { data: workflows, error } = await supabase
    .from("automation_workflows")
    .select("id, trigger_config")
    .eq("client_id", event.client_id)
    .eq("trigger_type", event.event_type)
    .eq("is_active", true)

  if (error) throw new Error(error.message)

  let matched = 0
  for (const workflow of workflows ?? []) {
    if (!matchesTrigger(workflow.id, event.event_type, event.payload, (workflow.trigger_config as Record<string, unknown>) ?? {})) continue
    matched++

    const { data: steps } = await supabase
      .from("automation_steps")
      .select("action_type, action_config")
      .eq("workflow_id", workflow.id)
      .order("step_order", { ascending: true })

    const log: Array<{ step: number; action_type: string; ok: boolean; detail: string }> = []
    let allOk = true
    for (const [i, step] of (steps ?? []).entries()) {
      const result = await executeAction(event.client_id, step.action_type, (step.action_config as Record<string, unknown>) ?? {}, event.payload)
      log.push({ step: i, action_type: step.action_type, ok: result.ok, detail: result.detail })
      if (!result.ok) allOk = false
    }

    await supabase.from("automation_runs").insert({
      workflow_id: workflow.id,
      client_id: event.client_id,
      event_id: event.id,
      status: allOk ? "success" : "error",
      log,
    })
  }

  return { workflowsMatched: matched }
}
