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
  if (eventType === "webhook.incoming" || eventType === "schedule.due") {
    // Igual que webhook.incoming: el evento ya viene dirigido a UN workflow
    // puntual (lib/omni/automation-schedule.ts ya resolvió qué workflow
    // está vencido antes de encolar) — nunca "todos los de este cliente".
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

  const matchedWorkflows = (workflows ?? []).filter((w) =>
    matchesTrigger(w.id, event.event_type, event.payload, (w.trigger_config as Record<string, unknown>) ?? {})
  )

  if (matchedWorkflows.length === 0) return { workflowsMatched: 0 }

  const { data: allSteps, error: stepsError } = await supabase
    .from("automation_steps")
    .select("workflow_id, step_order, action_type, action_config")
    .in(
      "workflow_id",
      matchedWorkflows.map((w) => w.id)
    )

  if (stepsError) throw new Error(stepsError.message)

  const stepsByWorkflow = new Map<string, NonNullable<typeof allSteps>>()
  for (const step of allSteps ?? []) {
    const list = stepsByWorkflow.get(step.workflow_id) ?? []
    list.push(step)
    stepsByWorkflow.set(step.workflow_id, list)
  }
  for (const list of stepsByWorkflow.values()) list.sort((a, b) => a.step_order - b.step_order)

  const runs: Array<{ workflow_id: string; client_id: string; event_id: string; status: "success" | "error"; log: unknown }> = []

  for (const workflow of matchedWorkflows) {
    const steps = stepsByWorkflow.get(workflow.id) ?? []
    const log: Array<{ step: number; action_type: string; ok: boolean; detail: string }> = []
    let allOk = true
    for (const [i, step] of steps.entries()) {
      const result = await executeAction(event.client_id, step.action_type, (step.action_config as Record<string, unknown>) ?? {}, event.payload)
      log.push({ step: i, action_type: step.action_type, ok: result.ok, detail: result.detail })
      if (!result.ok) allOk = false
    }
    runs.push({ workflow_id: workflow.id, client_id: event.client_id, event_id: event.id, status: allOk ? "success" : "error", log })
  }

  const { error: runsError } = await supabase.from("automation_runs").insert(runs)
  if (runsError) throw new Error(runsError.message)

  return { workflowsMatched: matchedWorkflows.length }
}
