// Instagram OAuth + sync — portado de Smart-Scale (lib/omni/instagram.ts),
// adaptado a multi-tenant: el state lleva client_id (tabla oauth_states) en
// vez de ser solo anti-CSRF, y todo query queda scopeado por client_id.

import { NextRequest } from "next/server"
import { randomBytes } from "node:crypto"
import { createServiceClient } from "@/lib/supabase-service"

const INSTAGRAM_SCOPES = ["instagram_business_basic", "instagram_business_manage_insights", "instagram_business_manage_messages"].join(",")

function appOrigin(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl.replace(/\/+$/, "")
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(/:$/, "")
  const host = req.headers.get("x-forwarded-host") ?? req.nextUrl.host
  return `${proto}://${host}`
}

export function instagramCallbackUrl(req: NextRequest): string {
  return `${appOrigin(req)}/api/oauth/instagram/callback`
}

/** Genera un state nuevo, lo liga a este client_id en oauth_states (TTL 10
 *  min, single-use), y arma la URL de autorización. Null si faltan
 *  credenciales de la app de Meta. */
export async function buildInstagramOAuthUrl(clientId: string, req: NextRequest): Promise<string | null> {
  const appId = process.env.INSTAGRAM_APP_ID
  if (!appId) return null

  const state = randomBytes(24).toString("base64url")
  const supabase = createServiceClient()
  const { error } = await supabase.from("oauth_states").insert({
    state,
    client_id: clientId,
    provider: "instagram",
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  })
  if (error) throw new Error(`No se pudo guardar el state de OAuth: ${error.message}`)

  const params = new URLSearchParams({
    force_reauth: "true",
    client_id: appId,
    redirect_uri: instagramCallbackUrl(req),
    state,
    response_type: "code",
  })
  // El scope va con comas literales — URLSearchParams las encodearía como
  // %2C y el OAuth de Instagram no lo acepta.
  return `https://www.instagram.com/oauth/authorize?${params.toString()}&scope=${INSTAGRAM_SCOPES}`
}

interface IgToken { accessToken: string; expiresAt?: Date }
interface IgProfile { accountId: string; accountName: string }

/** Intercambia el code OAuth por un token de larga duración + trae el perfil. */
export async function exchangeInstagramCode(code: string, redirectUri: string): Promise<{ token: IgToken; profile: IgProfile }> {
  const clientId = process.env.INSTAGRAM_APP_ID!
  const clientSecret = process.env.INSTAGRAM_APP_SECRET!

  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", redirect_uri: redirectUri, code }),
    signal: AbortSignal.timeout(10_000),
  })
  const shortText = await shortRes.text()
  if (!shortRes.ok) throw new Error(`IG short-token ${shortRes.status}: ${shortText.slice(0, 150)}`)
  const shortData = JSON.parse(shortText) as { access_token: string; user_id: number; expires_in?: number }
  let accessToken = shortData.access_token
  let expiresAt: Date | undefined = shortData.expires_in ? new Date(Date.now() + shortData.expires_in * 1000) : undefined

  const llRes = await fetch(
    `https://graph.instagram.com/access_token?${new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: clientSecret, access_token: accessToken }).toString()}`,
    { signal: AbortSignal.timeout(10_000) }
  )
  const llText = await llRes.text()
  if (llRes.ok) {
    let longData: { access_token?: string; expires_in?: number } = {}
    try {
      longData = JSON.parse(llText)
    } catch {
      /* respuesta no-JSON, seguimos con el token corto */
    }
    if (longData.access_token) {
      accessToken = longData.access_token
      expiresAt = longData.expires_in ? new Date(Date.now() + longData.expires_in * 1000) : expiresAt
    }
  }

  const igUserId = String(shortData.user_id)
  let accountName = igUserId
  const profileRes = await fetch(
    `https://graph.instagram.com/v23.0/me?fields=user_id,username&access_token=${encodeURIComponent(accessToken)}`,
    { signal: AbortSignal.timeout(10_000) }
  )
  if (profileRes.ok) {
    const p = (await profileRes.json()) as { username?: string }
    accountName = p.username ?? igUserId
  }

  return { token: { accessToken, expiresAt }, profile: { accountId: igUserId, accountName } }
}

export interface IgConversation {
  id: string
  participantUsername: string | null
  participantIgId: string | null
  selfIgId: string | null
}

export interface IgMessage {
  id: string
  from: "lead" | "client"
  body: string | null
  sentAt: string | null
}

/**
 * Trae las conversaciones recientes de la cuenta conectada.
 *
 * Identifica "la propia cuenta" dentro de cada conversación por USERNAME,
 * no por id — el id que devuelve /me en el OAuth no coincide con el id que
 * este endpoint de mensajería usa para el mismo participante (Meta usa dos
 * esquemas de ID distintos para la misma cuenta según el endpoint).
 * Comparar por id deja afuera a la cuenta propia silenciosamente — bug ya
 * encontrado y resuelto en el piloto original.
 */
export async function fetchIgConversations(accessToken: string, accountUsername: string): Promise<IgConversation[]> {
  const url = `https://graph.instagram.com/v23.0/me/conversations?platform=instagram&fields=participants&access_token=${encodeURIComponent(accessToken)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`IG conversations ${res.status}: ${(await res.text()).slice(0, 150)}`)
  const data = (await res.json()) as { data?: Array<{ id: string; participants?: { data?: Array<{ id: string; username?: string }> } }> }

  return (data.data ?? []).map((c) => {
    const participants = c.participants?.data ?? []
    const self = participants.find((p) => p.username === accountUsername)
    const other = participants.find((p) => p.username !== accountUsername) ?? participants.find((p) => p.id !== self?.id)
    return {
      id: c.id,
      participantUsername: other?.username ?? null,
      participantIgId: other?.id ?? null,
      selfIgId: self?.id ?? null,
    }
  })
}

/** `selfIgId` es el id resuelto por fetchIgConversations para ESA
 *  conversación puntual (no el account_id del OAuth). */
export async function fetchIgMessages(accessToken: string, conversationId: string, selfIgId: string | null): Promise<IgMessage[]> {
  const url = `https://graph.instagram.com/v23.0/${conversationId}?fields=messages.limit(50){id,from,to,message,created_time}&access_token=${encodeURIComponent(accessToken)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`IG messages ${res.status}: ${(await res.text()).slice(0, 150)}`)
  const data = (await res.json()) as { messages?: { data?: Array<{ id: string; from?: { id: string }; message?: string; created_time?: string }> } }

  return (data.messages?.data ?? []).map((m) => ({
    id: m.id,
    from: selfIgId && m.from?.id === selfIgId ? "client" : "lead",
    body: m.message ?? null,
    sentAt: m.created_time ?? null,
  }))
}
