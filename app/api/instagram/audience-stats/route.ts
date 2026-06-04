/**
 * GET /api/instagram/audience-stats
 *
 * Analytics agregados calculados desde datos ya almacenados
 * (instagram_account_insights + instagram_media + insights) — sin llamar a Graph.
 *
 * Devuelve { snapshots, reelStats, topReels }.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth/get-user"

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export async function GET(): Promise<NextResponse> {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const supabase = await createClient()
  const sb = supabase as any

  const { data: acct } = await sb
    .from("instagram_accounts")
    .select("id")
    .eq("is_primary", true)
    .maybeSingle()

  if (!acct) return NextResponse.json({ error: "NOT_CONNECTED" }, { status: 404 })

  const [{ data: snaps }, { data: media }] = await Promise.all([
    sb
      .from("instagram_account_insights")
      .select("period_date, followers_count, reach, impressions")
      .eq("account_id", acct.id)
      .order("period_date", { ascending: true })
      .limit(90),
    sb
      .from("instagram_media")
      .select(
        "id, caption, permalink, thumbnail_url, media_url, timestamp, " +
          "instagram_media_insights(likes, comments, plays, impressions, snapshotted_at)",
      )
      .eq("account_id", acct.id)
      .order("timestamp", { ascending: false })
      .order("snapshotted_at", { referencedTable: "instagram_media_insights", ascending: false })
      .limit(1, { referencedTable: "instagram_media_insights" })
      .limit(100),
  ])

  type Reel = {
    id: string
    caption: string | null
    permalink: string | null
    thumbnail_url: string | null
    media_url: string | null
    timestamp: string | null
    instagram_media_insights: Array<{ likes?: number; comments?: number; plays?: number; impressions?: number }>
  }

  const reels = (media ?? []) as Reel[]
  const flat = reels.map((r) => {
    const ins = r.instagram_media_insights?.[0] ?? {}
    return {
      id: r.id,
      caption: r.caption?.slice(0, 100) ?? "",
      url: r.permalink ?? "",
      thumbnailUrl: r.thumbnail_url ?? r.media_url ?? null,
      publishedAt: r.timestamp ?? null,
      likesCount: ins.likes ?? 0,
      commentsCount: ins.comments ?? 0,
      viewsCount: ins.plays ?? ins.impressions ?? 0,
    }
  })

  // Análisis por día de la semana
  const weekdayBuckets = Array.from({ length: 7 }, (_, i) => ({
    weekday: i,
    label: WEEKDAY_LABELS[i],
    totalLikes: 0,
    totalComments: 0,
    count: 0,
  }))
  for (const r of flat) {
    if (r.publishedAt) {
      const d = new Date(r.publishedAt).getDay()
      weekdayBuckets[d].totalLikes += r.likesCount
      weekdayBuckets[d].totalComments += r.commentsCount
      weekdayBuckets[d].count++
    }
  }
  const byWeekday = weekdayBuckets.map((b) => ({
    label: b.label,
    avgEngagement: b.count > 0 ? Math.round((b.totalLikes + b.totalComments) / b.count) : 0,
    count: b.count,
  }))

  const totalLikes = flat.reduce((s, r) => s + r.likesCount, 0)
  const totalComments = flat.reduce((s, r) => s + r.commentsCount, 0)
  const totalViews = flat.reduce((s, r) => s + r.viewsCount, 0)

  const topReels = [...flat]
    .sort((a, b) => b.likesCount + b.commentsCount - (a.likesCount + a.commentsCount))
    .slice(0, 5)

  return NextResponse.json({
    snapshots: ((snaps ?? []) as Array<{ period_date: string; followers_count: number; reach: number; impressions: number }>).map((s) => ({
      date: s.period_date,
      followers: s.followers_count ?? 0,
      engagementRate: 0,
      impressions: s.impressions ?? s.reach ?? 0,
    })),
    reelStats: {
      totalLikes,
      totalComments,
      totalViews,
      reelCount: flat.length,
      avgLikes: flat.length > 0 ? Math.round(totalLikes / flat.length) : 0,
      avgComments: flat.length > 0 ? Math.round(totalComments / flat.length) : 0,
      byWeekday,
    },
    topReels,
  })
}
