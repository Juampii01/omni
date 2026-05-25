/**
 * YouTube Data API v3 + YouTube Analytics API v2 client
 * Uses Google OAuth 2.0 tokens obtained via /api/youtube/oauth/start
 */

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const YT_BASE = "https://www.googleapis.com/youtube/v3"
const YT_ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2"

// ── OAuth ─────────────────────────────────────────────────────────────────────

export function buildYouTubeOAuthURL(redirectUri: string, state: string): string {
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
  ].join(" ")

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", scopes)
  url.searchParams.set("state", state)
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  return url.toString()
}

export async function exchangeYouTubeCode(
  code: string,
  redirectUri: string,
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube code exchange failed (${res.status}): ${text}`)
  }

  return res.json()
}

export async function refreshYouTubeToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: "refresh_token",
  })

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube token refresh failed (${res.status}): ${text}`)
  }

  return res.json()
}

// ── Channel ───────────────────────────────────────────────────────────────────

interface YTChannelResponse {
  items?: Array<{
    id: string
    snippet: {
      title: string
      customUrl?: string
      description?: string
      thumbnails?: { default?: { url?: string } }
    }
    statistics: {
      subscriberCount?: string
      videoCount?: string
      viewCount?: string
    }
  }>
}

export async function getYouTubeChannel(accessToken: string): Promise<{
  id: string
  title: string
  customUrl: string | null
  description: string | null
  thumbnailUrl: string | null
  subscriberCount: number
  videoCount: number
  viewCount: number
}> {
  const url = new URL(`${YT_BASE}/channels`)
  url.searchParams.set("part", "snippet,statistics")
  url.searchParams.set("mine", "true")

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube /channels failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as YTChannelResponse
  const item = data.items?.[0]
  if (!item) throw new Error("No YouTube channel found for this account")

  return {
    id: item.id,
    title: item.snippet.title,
    customUrl: item.snippet.customUrl ?? null,
    description: item.snippet.description ?? null,
    thumbnailUrl: item.snippet.thumbnails?.default?.url ?? null,
    subscriberCount: parseInt(item.statistics.subscriberCount ?? "0", 10),
    videoCount: parseInt(item.statistics.videoCount ?? "0", 10),
    viewCount: parseInt(item.statistics.viewCount ?? "0", 10),
  }
}

// ── Videos ────────────────────────────────────────────────────────────────────

interface YTSearchResponse {
  items?: Array<{
    id: { videoId: string }
    snippet: {
      title: string
      description: string
      thumbnails?: { medium?: { url?: string }; default?: { url?: string } }
      publishedAt: string
    }
  }>
}

interface YTVideosResponse {
  items?: Array<{
    id: string
    contentDetails: { duration?: string }
    statistics: {
      viewCount?: string
      likeCount?: string
      commentCount?: string
    }
  }>
}

export async function getYouTubeVideos(
  channelId: string,
  accessToken: string,
  maxResults = 25,
): Promise<
  Array<{
    videoId: string
    title: string
    description: string
    thumbnailUrl: string
    publishedAt: string
    duration: string
  }>
> {
  // Step 1: search for videos
  const searchUrl = new URL(`${YT_BASE}/search`)
  searchUrl.searchParams.set("part", "snippet")
  searchUrl.searchParams.set("channelId", channelId)
  searchUrl.searchParams.set("type", "video")
  searchUrl.searchParams.set("order", "date")
  searchUrl.searchParams.set("maxResults", String(maxResults))

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })

  if (!searchRes.ok) {
    const text = await searchRes.text()
    throw new Error(`YouTube /search failed (${searchRes.status}): ${text}`)
  }

  const searchData = (await searchRes.json()) as YTSearchResponse
  const searchItems = searchData.items ?? []

  if (searchItems.length === 0) return []

  // Build a map for basic info
  const basicMap = new Map(
    searchItems.map(i => [
      i.id.videoId,
      {
        title: i.snippet.title,
        description: i.snippet.description,
        thumbnailUrl:
          i.snippet.thumbnails?.medium?.url ??
          i.snippet.thumbnails?.default?.url ??
          "",
        publishedAt: i.snippet.publishedAt,
      },
    ]),
  )

  const videoIds = searchItems.map(i => i.id.videoId)

  // Step 2: get duration from contentDetails
  const videosUrl = new URL(`${YT_BASE}/videos`)
  videosUrl.searchParams.set("part", "contentDetails")
  videosUrl.searchParams.set("id", videoIds.join(","))

  const videosRes = await fetch(videosUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })

  if (!videosRes.ok) {
    const text = await videosRes.text()
    throw new Error(`YouTube /videos (contentDetails) failed (${videosRes.status}): ${text}`)
  }

  const videosData = (await videosRes.json()) as YTVideosResponse
  const durationMap = new Map(
    (videosData.items ?? []).map(i => [i.id, i.contentDetails.duration ?? "PT0S"]),
  )

  return videoIds.map(vid => {
    const basic = basicMap.get(vid)!
    return {
      videoId: vid,
      title: basic.title,
      description: basic.description,
      thumbnailUrl: basic.thumbnailUrl,
      publishedAt: basic.publishedAt,
      duration: durationMap.get(vid) ?? "PT0S",
    }
  })
}

// ── Video Stats ───────────────────────────────────────────────────────────────

export async function getVideoStats(
  videoIds: string[],
  accessToken: string,
): Promise<
  Array<{
    videoId: string
    viewCount: number
    likeCount: number
    commentCount: number
    duration: string
  }>
> {
  if (videoIds.length === 0) return []

  const url = new URL(`${YT_BASE}/videos`)
  url.searchParams.set("part", "statistics,contentDetails")
  url.searchParams.set("id", videoIds.join(","))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube /videos (statistics) failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as YTVideosResponse

  return (data.items ?? []).map(item => ({
    videoId: item.id,
    viewCount: parseInt(item.statistics.viewCount ?? "0", 10),
    likeCount: parseInt(item.statistics.likeCount ?? "0", 10),
    commentCount: parseInt(item.statistics.commentCount ?? "0", 10),
    duration: item.contentDetails.duration ?? "PT0S",
  }))
}

// ── Analytics ─────────────────────────────────────────────────────────────────

interface YTAnalyticsResponse {
  rows?: Array<[string, number, number, number, number]>
}

export async function getChannelAnalytics(
  channelId: string,
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<
  Array<{
    date: string
    views: number
    estimatedMinutesWatched: number
    averageViewDuration: number
    averageViewPercentage: number
  }>
> {
  const url = new URL(`${YT_ANALYTICS_BASE}/reports`)
  url.searchParams.set("ids", `channel==${channelId}`)
  url.searchParams.set("metrics", "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage")
  url.searchParams.set("dimensions", "day")
  url.searchParams.set("startDate", startDate)
  url.searchParams.set("endDate", endDate)
  url.searchParams.set("sort", "day")

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube Analytics /reports failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as YTAnalyticsResponse

  return (data.rows ?? []).map(row => ({
    date: row[0],
    views: row[1],
    estimatedMinutesWatched: row[2],
    averageViewDuration: row[3],
    averageViewPercentage: row[4],
  }))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse ISO 8601 duration to seconds.
 * Examples: "PT4M13S" → 253, "PT1H2M3S" → 3723, "PT30S" → 30
 */
export function parseDurationSeconds(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] ?? "0", 10)
  const minutes = parseInt(match[2] ?? "0", 10)
  const seconds = parseInt(match[3] ?? "0", 10)
  return hours * 3600 + minutes * 60 + seconds
}
