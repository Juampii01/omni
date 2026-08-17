// YouTube OAuth (Google) + lectura de métricas — mismo patrón multi-tenant que
// Instagram (lib/omni/instagram-oauth.ts): el state lleva client_id en la tabla
// oauth_states, el token se cifra en client_config. Scope: youtube.readonly
// (sensible, solo lectura) — leemos estadísticas del canal y de los videos para
// ayudar al cliente a decidir qué contenido crear.

import { NextRequest } from "next/server"
import { randomBytes } from "node:crypto"
import { createServiceClient } from "@/lib/supabase-service"

export const YT_SCOPE = "https://www.googleapis.com/auth/youtube.readonly"

function appOrigin(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl.replace(/\/+$/, "")
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(/:$/, "")
  const host = req.headers.get("x-forwarded-host") ?? req.nextUrl.host
  return `${proto}://${host}`
}

export function youtubeCallbackUrl(req: NextRequest): string {
  return `${appOrigin(req)}/api/oauth/youtube/callback`
}

/** Genera un state nuevo, lo liga a este client_id en oauth_states (TTL 10 min,
 *  single-use), y arma la URL de consentimiento de Google. Null si falta
 *  GOOGLE_CLIENT_ID. `prompt=consent` + `access_type=offline` garantizan que
 *  Google mande refresh_token para poder renovar sin re-consentimiento. */
export async function buildYouTubeOAuthUrl(clientId: string, req: NextRequest): Promise<string | null> {
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  if (!googleClientId) return null

  const state = randomBytes(24).toString("base64url")
  const supabase = createServiceClient()
  const { error } = await supabase.from("oauth_states").insert({
    state,
    client_id: clientId,
    provider: "youtube",
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  })
  if (error) throw new Error(`No se pudo guardar el state de OAuth: ${error.message}`)

  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: youtubeCallbackUrl(req),
    response_type: "code",
    scope: YT_SCOPE,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export interface YtToken {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string
}

/** Intercambia el code OAuth por access_token (+ refresh_token la primera vez). */
export async function exchangeYouTubeCode(code: string, redirectUri: string): Promise<YtToken> {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(10_000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`YouTube token ${res.status}: ${text.slice(0, 180)}`)
  const data = JSON.parse(text) as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    scope: data.scope,
  }
}

/** Renueva el access_token usando el refresh_token guardado. */
export async function refreshYouTubeToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(10_000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`YouTube refresh ${res.status}: ${text.slice(0, 180)}`)
  const data = JSON.parse(text) as { access_token: string; expires_in?: number }
  return { accessToken: data.access_token, expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined }
}

// --- YouTube Data API v3 (lectura, scope youtube.readonly) ------------------

export interface YtChannelStats {
  channelId: string
  title: string
  description: string | null
  thumbnail: string | null
  subscriberCount: number
  viewCount: number
  videoCount: number
  uploadsPlaylistId: string | null
}

/** channels.list(mine=true) — datos + estadísticas del canal del usuario. */
export async function fetchYouTubeChannel(accessToken: string): Promise<YtChannelStats> {
  const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`YouTube channels ${res.status}: ${(await res.text()).slice(0, 180)}`)
  const data = (await res.json()) as { items?: Array<Record<string, any>> }
  const ch = data.items?.[0]
  if (!ch) throw new Error("La cuenta de Google no tiene un canal de YouTube")
  const s = ch.statistics ?? {}
  return {
    channelId: ch.id,
    title: ch.snippet?.title ?? "Canal",
    description: ch.snippet?.description ?? null,
    thumbnail: ch.snippet?.thumbnails?.medium?.url ?? ch.snippet?.thumbnails?.default?.url ?? null,
    subscriberCount: Number(s.subscriberCount ?? 0),
    viewCount: Number(s.viewCount ?? 0),
    videoCount: Number(s.videoCount ?? 0),
    uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads ?? null,
  }
}

export interface YtVideo {
  id: string
  title: string
  thumbnail: string | null
  publishedAt: string | null
  viewCount: number
  likeCount: number
  commentCount: number
}

/** Últimos uploads del canal + estadísticas de cada video (2 llamadas:
 *  playlistItems para los ids, luego videos.list para las stats). */
export async function fetchYouTubeVideos(accessToken: string, uploadsPlaylistId: string, max = 10): Promise<YtVideo[]> {
  const plRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=${max}&playlistId=${encodeURIComponent(uploadsPlaylistId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15_000) }
  )
  if (!plRes.ok) throw new Error(`YouTube playlistItems ${plRes.status}: ${(await plRes.text()).slice(0, 180)}`)
  const plData = (await plRes.json()) as { items?: Array<{ contentDetails?: { videoId?: string } }> }
  const ids = (plData.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean) as string[]
  if (ids.length === 0) return []

  const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(",")}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!vRes.ok) throw new Error(`YouTube videos ${vRes.status}: ${(await vRes.text()).slice(0, 180)}`)
  const vData = (await vRes.json()) as { items?: Array<Record<string, any>> }
  return (vData.items ?? []).map((v) => ({
    id: v.id,
    title: v.snippet?.title ?? "(sin título)",
    thumbnail: v.snippet?.thumbnails?.medium?.url ?? v.snippet?.thumbnails?.default?.url ?? null,
    publishedAt: v.snippet?.publishedAt ?? null,
    viewCount: Number(v.statistics?.viewCount ?? 0),
    likeCount: Number(v.statistics?.likeCount ?? 0),
    commentCount: Number(v.statistics?.commentCount ?? 0),
  }))
}
