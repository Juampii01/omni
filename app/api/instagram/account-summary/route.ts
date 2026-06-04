/**
 * GET /api/instagram/account-summary
 *
 * Estado de conexión + snapshot agregado de la cuenta primaria.
 * Siempre responde 200; el consumidor usa `connected` para decidir la UI.
 *
 * Adaptado al schema real de Omni:
 *   - cuenta:    instagram_accounts (followers_count, media_count, etc.)
 *   - token:     integrations (expires_at)
 *   - reach/etc: último instagram_account_insights
 *   - views/eng: agregado de instagram_media + instagram_media_insights
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth/get-user"

interface AccountSummary {
  connected: boolean
  accountName?: string
  accountPic?: string | null
  expiresAt?: string | null
  tokenExpired?: boolean
  latestSnapshot?: {
    date: string | null
    followers: number
    posts: number
    engagementRate: number | null
    totalViews: number
    reach: number | null
    profileVisits: number | null
  } | null
  reelCount?: number
}

export async function GET(): Promise<NextResponse<AccountSummary>> {
  const user = await getUser()
  if (!user) return NextResponse.json({ connected: false })

  const supabase = await createClient()
  const sb = supabase as any

  const { data: acct } = await sb
    .from("instagram_accounts")
    .select(
      "id, username, profile_picture_url, followers_count, media_count, last_synced_at, integration_id, integrations(expires_at)",
    )
    .eq("is_primary", true)
    .maybeSingle()

  if (!acct) return NextResponse.json({ connected: false })

  const expiresAt: string | null = acct.integrations?.expires_at ?? null
  const tokenExpired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false

  // Último snapshot diario (reach / profile_views)
  const { data: snap } = await sb
    .from("instagram_account_insights")
    .select("period_date, followers_count, reach, profile_views")
    .eq("account_id", acct.id)
    .order("period_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Agregados de media: total views + engagement rate promedio + reel count
  const { data: mediaRows } = await sb
    .from("instagram_media")
    .select(
      "id, media_type, instagram_media_insights(plays, impressions, total_interactions, engagement_rate, snapshotted_at)",
    )
    .eq("account_id", acct.id)

  let totalViews = 0
  let engSum = 0
  let engCount = 0
  let reelCount = 0

  for (const m of (mediaRows ?? []) as Array<{
    media_type: string
    instagram_media_insights: Array<{
      plays?: number
      impressions?: number
      total_interactions?: number
      engagement_rate?: number
    }>
  }>) {
    if (m.media_type === "REEL" || m.media_type === "VIDEO") reelCount++
    // tomar el insight más reciente por media (el array puede traer varios snapshots)
    const ins = m.instagram_media_insights?.[0]
    if (ins) {
      totalViews += ins.plays ?? ins.impressions ?? 0
      if (typeof ins.engagement_rate === "number") {
        engSum += ins.engagement_rate
        engCount++
      }
    }
  }

  const summary: AccountSummary = {
    connected: true,
    accountName: acct.username ?? undefined,
    accountPic: acct.profile_picture_url ?? null,
    expiresAt,
    tokenExpired,
    reelCount,
    latestSnapshot: {
      date: snap?.period_date ?? acct.last_synced_at ?? null,
      followers: acct.followers_count ?? snap?.followers_count ?? 0,
      posts: acct.media_count ?? 0,
      engagementRate: engCount > 0 ? engSum / engCount : null,
      totalViews,
      reach: snap?.reach ?? null,
      profileVisits: snap?.profile_views ?? null,
    },
  }

  return NextResponse.json(summary)
}
