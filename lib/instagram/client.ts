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
  return graphIGGet<IGAccount>(`/${igUserId}`, token, {
    fields: "id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count",
  })
}

/**
 * Instagram Business Login (2024+).
 * Correct endpoint: graph.instagram.com/{user_id} — NOT /me.
 * Requires a long-lived token (exchange short-lived first via getLongLivedToken).
 */
export async function getIGAccountDirect(userToken: string, userId: string): Promise<IGAccount & { ig_user_id: string }> {
  const url = new URL(`${IG_GRAPH}/${userId}`)
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

export async function getRecentMedia(igUserId: string, token: string, limit = 25): Promise<IGMedia[]> {
  const data = await graphIGGet<{ data: IGMedia[] }>(`/${igUserId}/media`, token, {
    fields: "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp",
    limit: String(limit),
  })
  return data.data
}

export async function getMediaInsights(mediaId: string, mediaType: string, token: string): Promise<IGMediaInsights> {
  const baseMetrics = ["impressions", "reach", "likes", "comments", "shares", "saved"]
  const isVideo = mediaType === "REEL" || mediaType === "VIDEO"
  const metrics = isVideo ? [...baseMetrics, "plays", "total_interactions"] : [...baseMetrics, "total_interactions"]

  try {
    const data = await graphIGGet<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
      `/${mediaId}/insights`,
      token,
      { metric: metrics.join(",") }
    )
    const result: IGMediaInsights = {}
    for (const item of data.data) {
      const val = item.values?.[0]?.value ?? 0
      ;(result as Record<string, number>)[item.name === "saved" ? "saved" : item.name] = val
    }
    return result
  } catch {
    return {}
  }
}

// ── Account insights ──────────────────────────────────────────────────────────

export async function getAccountInsights(
  igUserId: string,
  token: string,
  period: "day" | "week" | "days_28" = "day",
  since?: Date,
  until?: Date
): Promise<IGAccountInsight[]> {
  const params: Record<string, string> = {
    metric: "follower_count,impressions,reach,profile_views,website_clicks,email_contacts",
    period,
  }
  if (since) params.since = Math.floor(since.getTime() / 1000).toString()
  if (until) params.until = Math.floor(until.getTime() / 1000).toString()

  try {
    const data = await graphIGGet<{ data: IGAccountInsight[] }>(`/${igUserId}/insights`, token, params)
    return data.data
  } catch {
    return []
  }
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

  const r = await fetch(`${IG_GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams(body),
  })
  if (!r.ok) throw new Error(`createImageContainer failed: ${await r.text()}`)
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

  const r = await fetch(`${IG_GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams(body),
  })
  if (!r.ok) throw new Error(`createReelContainer failed: ${await r.text()}`)
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

  const r = await fetch(`${IG_GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams(body),
  })
  if (!r.ok) throw new Error(`createCarouselContainer failed: ${await r.text()}`)
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

  const r = await fetch(`${IG_GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!r.ok) throw new Error(`publishContainer failed: ${await r.text()}`)
  const data = await r.json()
  return data.id as string
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
  const url = new URL(`${IG_GRAPH}/${igUserId}/conversations`)
  url.searchParams.set("platform", "instagram")
  url.searchParams.set("fields", "id,participants,updated_time,message_count")
  url.searchParams.set("access_token", token)

  const r = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!r.ok) return []
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
  const r = await fetch(`${IG_GRAPH}/${igUserId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
      access_token: token,
    }),
  })
  if (!r.ok) throw new Error(`sendMessage failed: ${await r.text()}`)
  const data = await r.json()
  return data.message_id as string
}
