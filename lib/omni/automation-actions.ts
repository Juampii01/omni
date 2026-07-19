// Un handler por action_type. Cada uno recibe el client_id del workflow
// (nunca el de otro), su propia config, y el payload del evento que
// disparó el workflow (para poder referenciar datos reales del trigger
// vía plantillas {{campo.anidado}}).
import { createServiceClient } from "@/lib/supabase-service"
import { isIP } from "node:net"
import { lookup } from "node:dns/promises"
import ipaddr from "ipaddr.js"

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

// Saca corchetes de un literal IPv6 ("[::1]" -> "::1") y un punto final de
// FQDN ("localhost." -> "localhost") — representan el mismo host para
// DNS/fetch, pero rompían el matching anterior: URL.hostname siempre
// devuelve un IPv6 entre corchetes (confirmado empíricamente), y ni
// net.isIP() ni ipaddr.js aceptan corchetes tampoco.
function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase()
}

// true si el literal de IP no es "unicast" (internet pública normal).
// ipaddr.js clasifica cada IP en un range (loopback/linkLocal/private/
// uniqueLocal/etc.) — permitir solo "unicast" en vez de mantener una
// lista de rangos prohibidos a mano bloquea por default cualquier rango
// no contemplado explícitamente (ej. carrierGradeNat, 100.64.0.0/10),
// además de los pedidos: loopback, private (RFC1918), linkLocal
// (169.254.0.0/16 / fe80::/10), uniqueLocal (fc00::/7). ipaddr.process()
// (no parse()) desenvuelve un IPv4-mapped (::ffff:127.0.0.1) a su IPv4
// real antes de clasificar, así que no hace falta desenvolverlo a mano.
function isPrivateOrReservedIp(ip: string): boolean {
  if (!isIP(ip)) return true
  try {
    return ipaddr.process(ip).range() !== "unicast"
  } catch {
    return true
  }
}

/**
 * Resuelve un hostname a IPs reales y valida cada una — un hostname
 * público puede tener un registro A/AAAA apuntando a una IP privada, así
 * que mirar el string del hostname no alcanza. Si ya es un literal de IP,
 * se valida directo sin ir a DNS. Si la resolución falla, falla cerrado
 * (bloquea), no abierto.
 *
 * LÍMITE CONOCIDO, no resuelto en este fix: esto valida la IP resuelta en
 * el momento del chequeo, pero fetch() hace su propia resolución DNS
 * interna una fracción de segundo después, al conectar de verdad. Un
 * ataque de DNS rebinding (el servidor DNS contesta una IP pública acá y
 * una privada al conectar) no queda cerrado del todo — cerrarlo de verdad
 * requeriría fijar la IP resuelta y conectar directo contra ella
 * (controlando el socket a mano, no vía fetch normal), un cambio bastante
 * más grande que este fix. Hallazgo aparte, para más adelante.
 */
async function resolveAndValidateHost(hostname: string): Promise<{ ok: boolean; detail?: string }> {
  const normalized = normalizeHostname(hostname)

  if (isIP(normalized)) {
    if (isPrivateOrReservedIp(normalized)) {
      return { ok: false, detail: `host no permitido (rango privado/reservado): ${normalized}` }
    }
    return { ok: true }
  }

  let addresses: { address: string }[]
  try {
    addresses = await lookup(normalized, { all: true })
  } catch (e) {
    return { ok: false, detail: `no se pudo resolver DNS de ${normalized}: ${e instanceof Error ? e.message : "error desconocido"}` }
  }

  if (addresses.length === 0) {
    return { ok: false, detail: `DNS no devolvió ninguna dirección para ${normalized}` }
  }

  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) {
      return { ok: false, detail: `host no permitido — ${normalized} resuelve a un rango privado/reservado (${address})` }
    }
  }

  return { ok: true }
}

const MAX_REDIRECTS = 3

async function callWebhook(url: string | undefined, payload: Record<string, unknown>): Promise<ActionResult> {
  if (!url) return { ok: false, detail: "call_webhook sin url configurada" }

  let current: URL
  try {
    current = new URL(url)
  } catch {
    return { ok: false, detail: `url inválida: ${url}` }
  }

  // Como mucho MAX_REDIRECTS redirects seguidos (4 requests en total: la
  // inicial + 3 saltos) — cada salto se revalida entero (protocolo + DNS +
  // rango de IP) antes de seguirlo, con redirect:"manual" para que fetch
  // no los siga solo y salte la validación.
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "https:" && current.protocol !== "http:") {
      return { ok: false, detail: "solo se permite http/https" }
    }

    const validation = await resolveAndValidateHost(current.hostname)
    if (!validation.ok) return { ok: false, detail: validation.detail! }

    let res: Response
    try {
      res = await fetch(current.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8_000),
        redirect: "manual",
      })
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : "error de red" }
    }

    const location = res.headers.get("location")
    const isRedirect = res.status >= 300 && res.status < 400
    if (!isRedirect || !location) {
      return { ok: res.ok, detail: `${res.status} ${res.statusText}` }
    }

    if (hop === MAX_REDIRECTS) {
      return { ok: false, detail: `demasiados redirects (más de ${MAX_REDIRECTS})` }
    }

    try {
      current = new URL(location, current)
    } catch {
      return { ok: false, detail: `redirect a una url inválida: ${location}` }
    }
  }

  return { ok: false, detail: "demasiados redirects" }
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
