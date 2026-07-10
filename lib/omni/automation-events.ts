// Punto de entrada único para disparar un evento de automatización — un
// insert liviano a la cola (automation_events). El procesamiento real
// (matchear workflows, ejecutar steps) pasa en el cron
// (/api/cron/process-automations), no acá — emitir un evento nunca debe
// bloquear ni hacer más lento el flujo que lo dispara.
import { createServiceClient } from "@/lib/supabase-service"

export async function emitOmniEvent(clientId: string, eventType: string, payload: Record<string, unknown>) {
  const supabase = createServiceClient()
  const { error } = await supabase.from("automation_events").insert({ client_id: clientId, event_type: eventType, payload })
  if (error) console.error(`[automation-events] no se pudo encolar ${eventType} para client_id=${clientId}:`, error.message)
}
