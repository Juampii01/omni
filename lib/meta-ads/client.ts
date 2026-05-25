/**
 * Meta Marketing API client.
 *
 * Uses the same Meta App as Instagram (META_APP_ID + META_APP_SECRET).
 * All requests go through Graph API v23.0 (or META_GRAPH_API_VERSION).
 */

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION ?? "v23.0"}`

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdAccount {
  id: string            // "act_xxxxxxx"
  name: string
  currency: string
  timezone_name: string
  account_status: number  // 1=active, 2=disabled
}

export interface Campaign {
  id: string
  name: string
  objective: string
  status: string
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
}

export interface InsightAction {
  action_type: string
  value: string
}

export interface CampaignInsight {
  date_start: string
  spend: string
  impressions: string
  clicks: string
  ctr: string
  cpc: string
  cpm: string
  reach: string
  frequency: string
  actions?: InsightAction[]
  action_values?: InsightAction[]
}

export interface AccountInsight {
  date_start: string
  spend: string
  impressions: string
  clicks: string
  ctr: string
  cpc: string
  cpm: string
  reach: string
  frequency: string
  actions?: InsightAction[]
  action_values?: InsightAction[]
}

// ── Internal helper ───────────────────────────────────────────────────────────

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta Ads Graph API ${path} → ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

/**
 * Build the Facebook OAuth dialog URL for Marketing API access.
 * Scope: ads_read, business_management, ads_management
 */
export function buildMetaAdsOAuthURL(redirectUri: string, state: string): string {
  // Note: Meta's OAuth dialog is NOT versioned — it uses a flat path.
  const url = new URL("https://www.facebook.com/dialog/oauth")
  url.searchParams.set("client_id", process.env.META_APP_ID!)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)
  url.searchParams.set("scope", "ads_read,business_management,ads_management")
  url.searchParams.set("response_type", "code")
  return url.toString()
}

/**
 * Exchange an authorization code for a long-lived (60-day) access token.
 */
export async function exchangeMetaAdsCode(code: string, redirectUri: string): Promise<string> {
  const url = new URL(`${GRAPH}/oauth/access_token`)
  url.searchParams.set("client_id", process.env.META_APP_ID!)
  url.searchParams.set("client_secret", process.env.META_APP_SECRET!)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("code", code)

  const r = await fetch(url.toString())
  if (!r.ok) {
    throw new Error(`Meta Ads token exchange failed: ${await r.text()}`)
  }
  const data = await r.json() as { access_token: string }
  return data.access_token
}

// ── Account info ──────────────────────────────────────────────────────────────

/**
 * List all ad accounts accessible to the authenticated user.
 */
export async function getAdAccounts(accessToken: string): Promise<AdAccount[]> {
  const data = await graphGet<{ data: AdAccount[] }>("/me/adaccounts", {
    fields: "id,name,currency,timezone_name,account_status",
    access_token: accessToken,
  })
  return data.data
}

/**
 * List campaigns for a given ad account.
 * accountId must include the "act_" prefix.
 */
export async function getCampaigns(accountId: string, accessToken: string): Promise<Campaign[]> {
  const data = await graphGet<{ data: Campaign[] }>(`/${accountId}/campaigns`, {
    fields: "id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time",
    limit: "50",
    access_token: accessToken,
  })
  return data.data
}

/**
 * Fetch day-level insights for a campaign within a date range.
 */
export async function getCampaignInsights(
  campaignId: string,
  accessToken: string,
  dateRange: { since: string; until: string },
): Promise<CampaignInsight[]> {
  try {
    const data = await graphGet<{ data: CampaignInsight[] }>(`/${campaignId}/insights`, {
      fields: "date_start,spend,impressions,clicks,ctr,cpc,cpm,actions,action_values,reach,frequency",
      time_increment: "1",
      time_range: JSON.stringify(dateRange),
      level: "campaign",
      access_token: accessToken,
    })
    return data.data
  } catch {
    return []
  }
}

/**
 * Fetch day-level insights for a whole ad account within a date range.
 */
export async function getAccountInsights(
  accountId: string,
  accessToken: string,
  dateRange: { since: string; until: string },
): Promise<AccountInsight[]> {
  try {
    const data = await graphGet<{ data: AccountInsight[] }>(`/${accountId}/insights`, {
      fields: "date_start,spend,impressions,clicks,ctr,cpc,cpm,actions,action_values,reach,frequency",
      time_increment: "1",
      time_range: JSON.stringify(dateRange),
      access_token: accessToken,
    })
    return data.data
  } catch {
    return []
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

/**
 * Exchange a valid (non-expired) long-lived token for a fresh one.
 * Returns the new access_token string.
 */
export async function refreshMetaAdsToken(accessToken: string): Promise<string> {
  const url = new URL(`${GRAPH}/oauth/access_token`)
  url.searchParams.set("grant_type", "fb_exchange_token")
  url.searchParams.set("client_id", process.env.META_APP_ID!)
  url.searchParams.set("client_secret", process.env.META_APP_SECRET!)
  url.searchParams.set("fb_exchange_token", accessToken)

  const r = await fetch(url.toString())
  if (!r.ok) {
    throw new Error(`Meta Ads token refresh failed: ${await r.text()}`)
  }
  const data = await r.json() as { access_token: string }
  return data.access_token
}
