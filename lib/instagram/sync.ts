import { createClient } from "@/lib/supabase/server"
import { decrypt } from "@/lib/crypto"
import {
  getIGProfile,
  getRecentMedia,
  getMediaInsights,
  getAccountInsights,
} from "./client"

/**
 * Full sync: refresh account profile, fetch last 25 posts + their insights,
 * fetch last 30 days of daily account insights.
 * Called by /api/cron/instagram-sync (Vercel cron).
 */
export async function syncInstagramAccount(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  // Load the primary IG account + encrypted token from integrations
  const { data: igRow, error: igErr } = await (supabase as any)
    .from("instagram_accounts")
    .select("id, ig_user_id, integration_id, integrations(access_token_encrypted)")
    .eq("is_primary", true)
    .single()

  if (igErr || !igRow) return { ok: false, error: "No IG account connected" }

  let token: string
  try {
    token = decrypt(igRow.integrations.access_token_encrypted)
  } catch {
    return { ok: false, error: "Could not decrypt access token" }
  }

  const igUserId: string = igRow.ig_user_id
  const igAccountDbId: string = igRow.id

  // 1. Refresh account profile
  try {
    const profile = await getIGProfile(igUserId, token)
    await (supabase as any)
      .from("instagram_accounts")
      .update({
        username: profile.username,
        name: profile.name,
        biography: profile.biography,
        website: profile.website,
        profile_picture_url: profile.profile_picture_url,
        followers_count: profile.followers_count,
        follows_count: profile.follows_count,
        media_count: profile.media_count,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", igAccountDbId)
  } catch (e) {
    console.error("sync: profile refresh failed", e)
  }

  // 2. Fetch recent media + upsert
  try {
    const media = await getRecentMedia(igUserId, token) // paginado, hasta 200

    for (const m of media) {
      await (supabase as any).from("instagram_media").upsert(
        {
          account_id: igAccountDbId,
          ig_media_id: m.id,
          media_type: m.media_type,
          media_url: m.media_url,
          thumbnail_url: m.thumbnail_url,
          permalink: m.permalink,
          caption: m.caption,
          timestamp: m.timestamp,
          raw: m,
        },
        { onConflict: "ig_media_id" }
      )

      // 3. Métricas:
      //    - likes/comments → de los CAMPOS de /me/media (confiable).
      //    - views/reach/etc → de GET /{media}/insights (m.views de /me/media
      //      vuelve null). getMediaInsights usa nombres v22+ y loguea errores.
      const { data: mediaRow } = await (supabase as any)
        .from("instagram_media")
        .select("id")
        .eq("ig_media_id", m.id)
        .single()

      if (mediaRow) {
        const likes = m.like_count ?? 0
        const comments = m.comments_count ?? 0

        const insights = await getMediaInsights(m.id, m.media_type, token)
        const views = insights.views ?? 0
        const totalInteractions = insights.total_interactions ?? likes + comments
        // engagement_rate guardado como PORCENTAJE (ej: 4.2 = 4.2%)
        const engRate = views > 0 ? ((likes + comments) / views) * 100 : 0

        await (supabase as any).from("instagram_media_insights").upsert(
          {
            media_id: mediaRow.id,
            snapshotted_at: new Date().toISOString(),
            impressions: null,
            reach: insights.reach ?? null,
            likes,
            comments,
            shares: insights.shares ?? null,
            saves: insights.saved ?? null,
            plays: views, // "views" de la Graph API → columna plays (la que usa el front)
            total_interactions: totalInteractions,
            engagement_rate: Math.min(engRate, 99.9999),
          },
          { onConflict: "media_id,snapshotted_at", ignoreDuplicates: true }
        )
      }
    }
  } catch (e) {
    console.error("sync: media sync failed", e)
  }

  // 4. Fetch 30 days of daily account insights
  try {
    const since = new Date()
    since.setDate(since.getDate() - 30)
    const until = new Date()

    const insightSeries = await getAccountInsights(igUserId, token, "day", since, until)

    // Build date → metric map
    const byDate: Record<string, Record<string, number>> = {}
    for (const series of insightSeries) {
      for (const point of series.values) {
        const date = point.end_time.split("T")[0]
        if (!byDate[date]) byDate[date] = {}
        byDate[date][series.name] = point.value
      }
    }

    for (const [date, metrics] of Object.entries(byDate)) {
      await (supabase as any).from("instagram_account_insights").upsert(
        {
          account_id: igAccountDbId,
          period_date: date,
          followers_count: metrics.follower_count,
          reach: metrics.reach,
          impressions: metrics.views ?? null, // "views" de cuenta → columna impressions (no hay columna views)
        },
        { onConflict: "account_id,period_date", ignoreDuplicates: true }
      )
    }
  } catch (e) {
    console.error("sync: account insights failed", e)
  }

  return { ok: true }
}
