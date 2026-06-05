import type {
  IGAccount,
  IGMedia,
  IGMediaInsights,
  IGAccountInsight,
  FacebookPage,
} from "./types"

// Facebook Graph API — used for Meta Ads / Pages only
const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION ?? "v23.0"}`

// Instagram Graph API (for long-lived tokens from graph.instagram.com)
const IG_GRAPH = `https://graph.instagram.com`

// (IG_API and IG_API_HOST removed — /me doesn't exist in Business Login flow)

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${GRAPH}${path}`)
  url.searchParams.set("access_token", token)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Graph API ${path} → ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

/** Uses graph.instagram.com — for all Instagram Business API calls */
async function graphIGGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${IG_GRAPH}${path}`)
  url.searchParams.set("access_token", token)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Instagram Graph API ${path} → ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

// ── OAuth (Instagram Business Login — api.instagram.com) ─────────────────────

export function buildOAuthURL(redirectUri: string, state: string): string {
  // Instagram Business Login (2024+): uses www.instagram.com/oauth/authorize.
  // api.instagram.com/oauth/authorize is the deprecated Basic Display API endpoint
  // and issues a different token type that doesn't work with graph.instagram.com.
  const scopes = [
    "instagram_business_basic",
    "instagram_business_content_publish",
    "instagram_business_manage_comments",
    "instagram_business_manage_insights",
    "instagram_business_manage_messages",
  ].join(",")

  const url = new URL("https://www.instagram.com/oauth/authorize")
  url.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID!)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", scopes)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", state)
  return url.toString()
}

/** Returns access_token + user_id (Instagram Business Login includes user_id in the token response) */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{ access_token: string; user_id: string }> {
  const r = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  })
  if (!r.ok) throw new Error(`Token exchange failed: ${await r.text()}`)
  const data = await r.json()
  return { access_token: data.access_token as string, user_id: String(data.user_id) }
}

export async function getLongLivedToken(shortToken: string): Promise<{ access_token: string; expires_in: number; token_type?: string }> {
  // Instagram Business Login: exchange short-lived (1h) → long-lived (60d)
  // Endpoint: GET graph.instagram.com/access_token
  // Params: grant_type=ig_exchange_token, client_secret, access_token
  const url = new URL("https://graph.instagram.com/access_token")
  url.searchParams.set("grant_type", "ig_exchange_token")
  url.searchParams.set("client_secret", process.env.INSTAGRAM_APP_SECRET!)
  url.searchParams.set("access_token", shortToken)

  const r = await fetch(url.toString(), { method: "GET" })
  if (!r.ok) {
    const body = await r.text()
    throw new Error(`Long-lived token exchange failed (${r.status}): ${body}`)
  }
  return r.json()
}

// ── Pages + IG Account discovery ──────────────────────────────────────────────

export async function getPages(userToken: string): Promise<FacebookPage[]> {
  const data = await graphGet<{ data: FacebookPage[] }>("/me/accounts", userToken, {
    fields: "id,name,access_token,instagram_business_account",
  })
  return data.data
}

export async function getIGProfile(igUserId: string, token: string): Promise<IGAccount> {
  // Instagram Business Login: usar /me, NO /{user_id} (este último da
  // error 100/subcode 33 "Unsupported get request" con estos tokens).
  void igUserId
  const data = await graphIGGet<{
    user_id?: string; id?: string; username: string; name?: string
    biography?: string; website?: string; profile_picture_url?: string
    followers_count?: number; follows_count?: number; media_count?: number
  }>(`/me`, token, {
    fields: "user_id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count",
  })
  return {
    id: data.id ?? data.user_id ?? igUserId,
    username: data.username,
    name: data.name ?? data.username,
    biography: data.biography ?? undefined,
    website: data.website ?? undefined,
    profile_picture_url: data.profile_picture_url ?? undefined,
    followers_count: data.followers_count ?? 0,
    follows_count: data.follows_count ?? 0,
    media_count: data.media_count ?? 0,
  }
}

/**
 * Instagram Business Login (2024+).
 * Endpoint correcto: graph.instagram.com/me (NO /{user_id}, que devuelve
 * error 100/subcode 33 con tokens de Instagram Login).
 * Requiere un long-lived token (exchange short-lived primero vía getLongLivedToken).
 */
export async function getIGAccountDirect(userToken: string, userId: string): Promise<IGAccount & { ig_user_id: string }> {
  const url = new URL(`${IG_GRAPH}/me`)
  url.searchParams.set(
    "fields",
    "user_id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count,account_type"
  )
  url.searchParams.set("access_token", userToken)

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Instagram API /${userId} → ${res.status}: ${body}`)
  }

  const data = await res.json() as {
    user_id?: string; id?: string; username: string; name?: string
    biography?: string; website?: string; profile_picture_url?: string
    followers_count?: number; follows_count?: number; media_count?: number
    account_type?: string
  }

  return {
    ig_user_id: data.user_id ?? data.id ?? userId,
    id: data.id ?? data.user_id ?? userId,
    username: data.username,
    name: data.name ?? data.username,
    biography: data.biography ?? undefined,
    website: data.website ?? undefined,
    profile_picture_url: data.profile_picture_url ?? undefined,
    followers_count: data.followers_count ?? 0,
    follows_count: data.follows_count ?? 0,
    media_count: data.media_count ?? 0,
  }
}

// ── Media ─────────────────────────────────────────────────────────────────────

export async function getRecentMedia(igUserId: string, token: string, max = 200): Promise<IGMedia[]> {
  // /me/media con paginación (sigue paging.next) para traer TODOS los media,
  // no solo los primeros 25. Pedimos like_count/comments_count/views como CAMPOS.
  // `max` es un tope de seguridad para no loopear infinito.
  void igUserId
  // like_count/comments_count vienen como campos (confiable). NO pedimos `views`
  // acá (vuelve null en /me/media) — las views reales salen de /{media}/insights.
  const fields =
    "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count"
  const first = new URL(`${IG_GRAPH}/me/media`)
  first.searchParams.set("fields", fields)
  first.searchParams.set("limit", "100")
  first.searchParams.set("access_token", token)

  const all: IGMedia[] = []
  let nextUrl: string | null = first.toString()
  let page = 0
  while (nextUrl && all.length < max && page < 10) {
    const res = await fetch(nextUrl, { next: { revalidate: 0 } })
    if (!res.ok) {
      const body = await res.text()
      // La primera página es error fatal (igual que antes); las siguientes solo cortan.
      if (page === 0) throw new Error(`Instagram Graph API /me/media → ${res.status}: ${body}`)
      console.error(`getRecentMedia: paginación cortada en página ${page}: ${res.status} ${body}`)
      break
    }
    const json = (await res.json()) as { data?: IGMedia[]; paging?: { next?: string } }
    all.push(...(json.data ?? []))
    nextUrl = json.paging?.next ?? null
    page++
  }
  return all.slice(0, max)
}

/**
 * Insights por media desde GET /{ig-media-id}/insights.
 * Usa los nombres ACTUALES de Meta (v22+): `views` reemplaza a
 * impressions/plays/video_views (deprecados → rompen la llamada).
 *   - núcleo (todo media):  views, reach
 *   - REEL/VIDEO además:    total_interactions, saved, shares
 * Si el set combinado falla, se reintenta métrica por métrica (un media_type
 * puede no aceptar alguna). SIEMPRE loguea status + body crudo del error de Meta.
 */
export async function getMediaInsights(mediaId: string, mediaType: string, token: string): Promise<IGMediaInsights> {
  const isVideo = mediaType === "REEL" || mediaType === "VIDEO"
  const metrics = isVideo
    ? ["views", "reach", "total_interactions", "saved", "shares"]
    : ["views", "reach"]

  async function fetchInsights(
    ms: string[],
  ): Promise<{ ok: true; values: Record<string, number> } | { ok: false; status: number; body: string }> {
    const url = new URL(`${IG_GRAPH}/${mediaId}/insights`)
    url.searchParams.set("metric", ms.join(","))
    url.searchParams.set("access_token", token)
    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    const body = await res.text()
    if (!res.ok) return { ok: false, status: res.status, body }
    let json: { data?: Array<{ name: string; values?: Array<{ value: number }>; total_value?: { value: number } }> }
    try {
      json = JSON.parse(body)
    } catch {
      return { ok: false, status: res.status, body }
    }
    const values: Record<string, number> = {}
    for (const item of json.data ?? []) {
      values[item.name] = item.total_value?.value ?? item.values?.[0]?.value ?? 0
    }
    return { ok: true, values }
  }

  function apply(r: IGMediaInsights, v: Record<string, number>) {
    if ("views" in v) r.views = v.views
    if ("reach" in v) r.reach = v.reach
    if ("total_interactions" in v) r.total_interactions = v.total_interactions
    if ("saved" in v) r.saved = v.saved
    if ("shares" in v) r.shares = v.shares
  }

  const result: IGMediaInsights = {}
  const combined = await fetchInsights(metrics)
  if (combined.ok) {
    apply(result, combined.values)
    return result
  }

  // El set combinado falló → log crudo de Meta + fallback métrica por métrica.
  console.error(
    `getMediaInsights ${mediaId} (${mediaType}) combinado falló [${metrics.join(",")}]: ${combined.status} ${combined.body}`,
  )
  for (const metric of metrics) {
    const single = await fetchInsights([metric])
    if (single.ok) apply(result, single.values)
    else console.error(`getMediaInsights ${mediaId} metric=${metric} falló: ${single.status} ${single.body}`)
  }
  return result
}

// ── Account insights ──────────────────────────────────────────────────────────

export async function getAccountInsights(
  igUserId: string,
  token: string,
  period: "day" | "week" | "days_28" = "day",
  since?: Date,
  until?: Date
): Promise<IGAccountInsight[]> {
  void igUserId
  const sinceTs = since ? Math.floor(since.getTime() / 1000).toString() : undefined
  const untilTs = until ? Math.floor(until.getTime() / 1000).toString() : undefined
  const todayIso = (until ?? new Date()).toISOString()

  // Nombres ACTUALES (v22+). `reach`/`views` a nivel cuenta requieren
  // metric_type=total_value; `follower_count` es serie temporal por día.
  // NO impressions/profile_views/website_clicks/email_contacts (deprecados).
  const specs: Array<{ metric: string; totalValue: boolean }> = [
    { metric: "follower_count", totalValue: false },
    { metric: "reach", totalValue: true },
    { metric: "views", totalValue: true },
  ]

  const out: IGAccountInsight[] = []
  for (const spec of specs) {
    const url = new URL(`${IG_GRAPH}/me/insights`)
    url.searchParams.set("metric", spec.metric)
    url.searchParams.set("period", period)
    if (spec.totalValue) url.searchParams.set("metric_type", "total_value")
    if (sinceTs) url.searchParams.set("since", sinceTs)
    if (untilTs) url.searchParams.set("until", untilTs)
    url.searchParams.set("access_token", token)

    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    const body = await res.text()
    if (!res.ok) {
      console.error(`getAccountInsights metric=${spec.metric} falló: ${res.status} ${body}`)
      continue
    }
    let json: {
      data?: Array<{
        name: string
        period?: string
        values?: Array<{ value: number; end_time: string }>
        total_value?: { value: number }
      }>
    }
    try {
      json = JSON.parse(body)
    } catch {
      console.error(`getAccountInsights metric=${spec.metric} JSON inválido: ${body}`)
      continue
    }
    for (const item of json.data ?? []) {
      if (item.values && item.values.length) {
        out.push({ name: item.name, period: item.period ?? period, values: item.values })
      } else if (item.total_value) {
        // total_value no trae serie diaria → lo anclamos a "hoy"
        out.push({ name: item.name, period: item.period ?? period, values: [{ value: item.total_value.value, end_time: todayIso }] })
      }
    }
  }
  return out
}

// ── Token refresh ─────────────────────────────────────────────────────────────

export async function refreshLongLivedToken(token: string): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL("https://graph.instagram.com/refresh_access_token")
  url.searchParams.set("grant_type", "ig_refresh_token")
  url.searchParams.set("access_token", token)

  const r = await fetch(url.toString())
  if (!r.ok) throw new Error(`Token refresh failed: ${await r.text()}`)
  return r.json()
}

// ── Publishing ────────────────────────────────────────────────────────────────

/** Step 1: Create a single image media container. Returns creation_id. */
export async function createImageContainer(
  igUserId: string,
  token: string,
  imageUrl: string,
  caption?: string,
  isCarouselItem = false,
): Promise<string> {
  const body: Record<string, string> = {
    image_url:    imageUrl,
    access_token: token,
  }
  if (caption && !isCarouselItem) body.caption = caption
  if (isCarouselItem) body.is_carousel_item = "true"

  void igUserId
  const r = await fetch(`${IG_GRAPH}/me/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams(body),
  })
  if (!r.ok) {
    const t = await r.text()
    console.error(`createImageContainer failed: ${r.status} ${t}`)
    throw new Error(t)
  }
  const data = await r.json()
  return data.id as string
}

/** Item de carrusel tipo VIDEO (media_type=VIDEO + is_carousel_item, NO REELS). */
export async function createCarouselVideoItem(
  igUserId: string,
  token: string,
  videoUrl: string,
): Promise<string> {
  void igUserId
  const r = await fetch(`${IG_GRAPH}/me/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      media_type: "VIDEO",
      video_url: videoUrl,
      is_carousel_item: "true",
      access_token: token,
    }),
  })
  if (!r.ok) {
    const t = await r.text()
    console.error(`createCarouselVideoItem failed: ${r.status} ${t}`)
    throw new Error(t)
  }
  const data = await r.json()
  return data.id as string
}

/** Step 1b: Create a REEL media container. Returns creation_id. */
export async function createReelContainer(
  igUserId: string,
  token: string,
  videoUrl: string,
  caption?: string,
  coverUrl?: string,
): Promise<string> {
  const body: Record<string, string> = {
    media_type:   "REELS",
    video_url:    videoUrl,
    access_token: token,
  }
  if (caption)  body.caption   = caption
  if (coverUrl) body.cover_url = coverUrl

  void igUserId
  const r = await fetch(`${IG_GRAPH}/me/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams(body),
  })
  if (!r.ok) {
    const t = await r.text()
    console.error(`createReelContainer failed: ${r.status} ${t}`)
    throw new Error(t)
  }
  const data = await r.json()
  return data.id as string
}

/** Step 1c: Create a CAROUSEL container from a list of item creation_ids. */
export async function createCarouselContainer(
  igUserId: string,
  token: string,
  itemIds: string[],
  caption?: string,
): Promise<string> {
  const body: Record<string, string> = {
    media_type:   "CAROUSEL",
    children:     itemIds.join(","),
    access_token: token,
  }
  if (caption) body.caption = caption

  void igUserId
  const r = await fetch(`${IG_GRAPH}/me/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams(body),
  })
  if (!r.ok) {
    const t = await r.text()
    console.error(`createCarouselContainer failed: ${r.status} ${t}`)
    throw new Error(t)
  }
  const data = await r.json()
  return data.id as string
}

/** Step 2: Publish a media container. Returns the IG media ID. */
export async function publishContainer(
  igUserId: string,
  token: string,
  creationId: string,
): Promise<string> {
  const body = new URLSearchParams({
    creation_id:  creationId,
    access_token: token,
  })

  void igUserId
  const r = await fetch(`${IG_GRAPH}/me/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!r.ok) {
    const t = await r.text()
    console.error(`publishContainer failed: ${r.status} ${t}`)
    throw new Error(t)
  }
  const data = await r.json()
  return data.id as string
}

/** Límite real de publicación: GET /me/content_publishing_limit (duro: 100/24h). */
export async function getContentPublishingLimit(
  token: string,
): Promise<{ quota_usage: number; quota_total: number } | null> {
  const url = new URL(`${IG_GRAPH}/me/content_publishing_limit`)
  url.searchParams.set("fields", "config,quota_usage")
  url.searchParams.set("access_token", token)
  const r = await fetch(url.toString(), { next: { revalidate: 0 } })
  const body = await r.text()
  if (!r.ok) {
    console.error(`getContentPublishingLimit failed: ${r.status} ${body}`)
    return null
  }
  try {
    const json = JSON.parse(body) as {
      data?: Array<{ quota_usage?: number; config?: { quota_total?: number } }>
    }
    const row = json.data?.[0]
    return {
      quota_usage: row?.quota_usage ?? 0,
      quota_total: row?.config?.quota_total ?? 100,
    }
  } catch {
    console.error(`getContentPublishingLimit JSON inválido: ${body}`)
    return null
  }
}

/** Check container status (for async video processing). */
export async function getContainerStatus(
  containerId: string,
  token: string,
): Promise<{ status_code: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED"; error_message?: string }> {
  const url = new URL(`${IG_GRAPH}/${containerId}`)
  url.searchParams.set("fields", "status_code,status")
  url.searchParams.set("access_token", token)

  const r = await fetch(url.toString())
  if (!r.ok) throw new Error(`getContainerStatus failed: ${await r.text()}`)
  return r.json()
}

// ── DMs (Conversations) ───────────────────────────────────────────────────────

/** Get list of conversations for an IG Business account. */
export async function getConversations(
  igUserId: string,
  token: string,
): Promise<Array<{
  id: string
  participants: { data: Array<{ id: string; username?: string; name?: string }> }
  updated_time: string
  message_count: number
}>> {
  // /me/conversations — NO /{user_id}/conversations (falla con tokens de Instagram Login)
  void igUserId
  const url = new URL(`${IG_GRAPH}/me/conversations`)
  url.searchParams.set("platform", "instagram")
  url.searchParams.set("fields", "id,participants,updated_time,message_count")
  url.searchParams.set("access_token", token)

  const r = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!r.ok) {
    console.error(`getConversations failed: ${r.status} ${await r.text()}`)
    return []
  }
  const data = await r.json()
  return data.data ?? []
}

/** Get messages in a conversation. */
export async function getMessages(
  conversationId: string,
  token: string,
  limit = 25,
): Promise<Array<{
  id: string
  message: string
  from: { id: string; username?: string }
  created_time: string
  attachments?: { data: Array<{ type: string; url?: string }> }
}>> {
  const url = new URL(`${IG_GRAPH}/${conversationId}/messages`)
  url.searchParams.set("fields", "id,message,from,created_time,attachments")
  url.searchParams.set("limit", String(limit))
  url.searchParams.set("access_token", token)

  const r = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!r.ok) return []
  const data = await r.json()
  return data.data ?? []
}

/** Send a message to an existing conversation. */
export async function sendMessage(
  igUserId: string,
  token: string,
  recipientId: string,
  message: string,
): Promise<string> {
  // /me/messages — NO /{user_id}/messages (falla con tokens de Instagram Login)
  void igUserId
  const r = await fetch(`${IG_GRAPH}/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
      access_token: token,
    }),
  })
  if (!r.ok) {
    const body = await r.text()
    console.error(`sendMessage failed: ${r.status} ${body}`)
    throw new Error(`sendMessage failed: ${body}`)
  }
  const data = await r.json()
  return data.message_id as string
}
