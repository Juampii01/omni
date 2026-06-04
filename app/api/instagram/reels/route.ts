/**
 * GET /api/instagram/reels
 *
 * Lista las piezas de contenido (reels/videos/posts) de la cuenta primaria,
 * con sus métricas más recientes. Solo lectura — usar POST /api/instagram/sync
 * para refrescar desde Instagram primero.
 *
 * Devuelve filas con forma `UserReelRow` (consumida por la UI Pro).
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth/get-user"

export interface UserReelRow {
  id: string
  instagramId: string
  shortcode: string
  url: string
  thumbnailUrl: string | null
  videoUrl: string | null
  caption: string | null
  likesCount: number
  commentsCount: number
  viewsCount: number
  publishedAt: string | null
  syncedAt: string | null
}

/** Extrae el shortcode de un permalink de Instagram. */
function shortcodeFromPermalink(permalink: string | null, fallback: string): string {
  if (!permalink) return fallback
  const m = permalink.match(/\/(?:p|reel|tv)\/([^/?#]+)/)
  return m?.[1] ?? fallback
}

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

  if (!acct) return NextResponse.json({ reels: [] })

  const { data: rows } = await sb
    .from("instagram_media")
    .select(
      "id, ig_media_id, media_type, media_url, thumbnail_url, permalink, caption, timestamp, " +
        "instagram_media_insights(likes, comments, plays, impressions, total_interactions, snapshotted_at)",
    )
    .eq("account_id", acct.id)
    .order("timestamp", { ascending: false })
    .limit(100)

  const reels: UserReelRow[] = ((rows ?? []) as Array<{
    id: string
    ig_media_id: string
    media_type: string
    media_url: string | null
    thumbnail_url: string | null
    permalink: string | null
    caption: string | null
    timestamp: string | null
    instagram_media_insights: Array<{
      likes?: number
      comments?: number
      plays?: number
      impressions?: number
    }>
  }>).map((m) => {
    // insight más reciente (ya viene ordenado desc por la relación, tomamos [0])
    const ins = m.instagram_media_insights?.[0] ?? {}
    return {
      id: m.id,
      instagramId: m.ig_media_id,
      shortcode: shortcodeFromPermalink(m.permalink, m.ig_media_id),
      url: m.permalink ?? `https://www.instagram.com/p/${m.ig_media_id}/`,
      thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
      videoUrl: m.media_type === "VIDEO" || m.media_type === "REEL" ? m.media_url : null,
      caption: m.caption ?? null,
      likesCount: ins.likes ?? 0,
      commentsCount: ins.comments ?? 0,
      viewsCount: ins.plays ?? ins.impressions ?? 0,
      publishedAt: m.timestamp ?? null,
      syncedAt: null,
    }
  })

  return NextResponse.json({ reels })
}
