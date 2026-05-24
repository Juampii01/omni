import type {
  IGAccount,
  IGMedia,
  IGMediaInsights,
  IGAccountInsight,
  FacebookPage,
} from "./types"

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION ?? "v23.0"}`

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

// ── OAuth ─────────────────────────────────────────────────────────────────────

export function buildOAuthURL(redirectUri: string, state: string): string {
  const scopes = [
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
  ].join(",")

  const url = new URL(`https://www.facebook.com/${process.env.META_GRAPH_API_VERSION ?? "v23.0"}/dialog/oauth`)
  url.searchParams.set("client_id", process.env.META_APP_ID!)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", scopes)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", state)
  return url.toString()
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const url = new URL(`${GRAPH}/oauth/access_token`)
  url.searchParams.set("client_id", process.env.META_APP_ID!)
  url.searchParams.set("client_secret", process.env.META_APP_SECRET!)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("code", code)

  const r = await fetch(url.toString())
  if (!r.ok) throw new Error(`Token exchange failed: ${await r.text()}`)
  const data = await r.json()
  return data.access_token as string
}

export async function getLongLivedToken(shortToken: string): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL(`${GRAPH}/oauth/access_token`)
  url.searchParams.set("grant_type", "fb_exchange_token")
  url.searchParams.set("client_id", process.env.META_APP_ID!)
  url.searchParams.set("client_secret", process.env.META_APP_SECRET!)
  url.searchParams.set("fb_exchange_token", shortToken)

  const r = await fetch(url.toString())
  if (!r.ok) throw new Error(`Long-lived token exchange failed: ${await r.text()}`)
  return r.json()
}

// ── Pages + IG Account discovery ──────────────────────────────────────────────

export async function getPages(userToken: string): Promise<FacebookPage[]> {
  const data = await graphGet<{ data: FacebookPage[] }>("/me/accounts", userToken, {
    fields: "id,name,access_token,instagram_business_account",
  })
  return data.data
}

export async function getIGProfile(igUserId: string, pageToken: string): Promise<IGAccount> {
  return graphGet<IGAccount>(`/${igUserId}`, pageToken, {
    fields: "id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count",
  })
}

// ── Media ─────────────────────────────────────────────────────────────────────

export async function getRecentMedia(igUserId: string, token: string, limit = 25): Promise<IGMedia[]> {
  const data = await graphGet<{ data: IGMedia[] }>(`/${igUserId}/media`, token, {
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
    const data = await graphGet<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
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
    const data = await graphGet<{ data: IGAccountInsight[] }>(`/${igUserId}/insights`, token, params)
    return data.data
  } catch {
    return []
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

export async function refreshLongLivedToken(token: string): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL(`${GRAPH}/refresh_access_token`)
  url.searchParams.set("grant_type", "ig_refresh_token")
  url.searchParams.set("access_token", token)

  const r = await fetch(url.toString())
  if (!r.ok) throw new Error(`Token refresh failed: ${await r.text()}`)
  return r.json()
}
