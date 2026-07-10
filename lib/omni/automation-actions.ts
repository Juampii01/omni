// Un handler por action_type. Cada uno recibe el client_id del workflow
// (nunca el de otro), su propia config, y el payload del evento que
// disparó el workflow (para poder referenciar datos reales del trigger
// vía plantillas {{campo.anidado}}).
import { createServiceClient } from "@/lib/supabase-service"

export interface ActionResult {
  ok: boolean
  detail: string
}

/** Sustituye {{a.b.c}} por el valor en esa ruta dentro de payload. Si no
 *  existe, deja el placeholder tal cual (no rompe, no inventa datos). */
function interpolate(template: string | undefined, payload: Record<string, unknown>): string {
  if (!template) return ""
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path: string) => {
    const value = path.split(".").reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) return (acc as Record<string, unknown>)[key]
      return undefined
    }, payload)
    if (value === undefined || value === null) return match
    return typeof value === "string" ? value : JSON.stringify(value)
  })
}

const PRIVATE_HOST_PATTERNS = [/^localhost$/i, /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^0\.0\.0\.0$/, /^::1$/]

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((p) => p.test(hostname))
}

async function callWebhook(url: string | undefined, payload: Record<string, unknown>): Promise<ActionResult> {
  if (!url) return { ok: false, detail: "call_webhook sin url configurada" }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, detail: `url inválida: ${url}` }
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { ok: false, detail: "solo se permite http/https" }
  if (isPrivateHost(parsed.hostname)) return { ok: false, detail: `host no permitido (rango privado/local): ${parsed.hostname}` }

  try {
    const res = await fetch(parsed.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    })
    return { ok: res.ok, detail: `${res.status} ${res.statusText}` }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "error de red" }
  }
}

export async function executeAction(
  clientId: string,
  actionType: string,
  actionConfig: Record<string, unknown>,
  eventPayload: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = createServiceClient()

  try {
    if (actionType === "create_task") {
      const title = interpolate((actionConfig.title as string) ?? "Tarea automática", eventPayload)
      const description = interpolate(actionConfig.description as string, eventPayload)
      const { error } = await supabase.from("kanban_tasks").insert({
        client_id: clientId,
        title,
        description,
        column_id: (actionConfig.columnId as string) || "por-hacer",
        label_text: (actionConfig.labelText as string) || "Automatización",
      })
      return error ? { ok: false, detail: error.message } : { ok: true, detail: `Tarea creada: ${title}` }
    }

    if (actionType === "send_notification") {
      const title = interpolate((actionConfig.title as string) ?? "Notificación automática", eventPayload)
      const body = interpolate(actionConfig.body as string, eventPayload)
      const { error } = await supabase
        .from("notifications")
        .insert({ client_id: clientId, title, body, link: (actionConfig.link as string) || null })
      return error ? { ok: false, detail: error.message } : { ok: true, detail: `Notificación enviada: ${title}` }
    }

    if (actionType === "call_webhook") {
      return await callWebhook(actionConfig.url as string | undefined, eventPayload)
    }

    return { ok: false, detail: `action_type desconocido: ${actionType}` }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "error desconocido ejecutando la acción" }
  }
}
