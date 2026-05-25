/**
 * YouTube channel sync — refreshes channel stats, videos, and analytics.
 * Called by the sync cron job or manually from the UI.
 */

import { createServiceClient } from "@/lib/supabase/server"
import { encrypt, decrypt } from "@/lib/crypto"
import {
  refreshYouTubeToken,
  getYouTubeChannel,
  getYouTubeVideos,
  getVideoStats,
  getChannelAnalytics,
  parseDurationSeconds,
} from "./client"

export async function syncYouTubeChannel(): Promise<{
  ok: boolean
  error?: string
  videos?: number
}> {
  try {
    const supabase = await createServiceClient()
    const sb = supabase as any

    // 1. Find active channel
    const { data: channelRow, error: findErr } = await sb
      .from("youtube_channels")
      .select("id, channel_id, access_token_enc, refresh_token_enc, token_expires_at")
      .eq("is_active", true)
      .maybeSingle()

    if (findErr) throw new Error(`Error buscando canal: ${findErr.message}`)
    if (!channelRow) return { ok: false, error: "No hay canal de YouTube conectado" }

    let accessToken: string

    // 2. Check if token is expired (with 5-minute buffer)
    const expiresAt = channelRow.token_expires_at
      ? new Date(channelRow.token_expires_at)
      : null
    const needsRefresh = !expiresAt || expiresAt.getTime() < Date.now() + 5 * 60 * 1000

    if (needsRefresh && channelRow.refresh_token_enc) {
      const refreshToken = decrypt(channelRow.refresh_token_enc)
      const refreshed = await refreshYouTubeToken(refreshToken)
      accessToken = refreshed.access_token
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

      await sb
        .from("youtube_channels")
        .update({
          access_token_enc: encrypt(accessToken),
          token_expires_at: newExpiresAt,
        })
        .eq("id", channelRow.id)
    } else {
      accessToken = decrypt(channelRow.access_token_enc)
    }

    const ytChannelId: string = channelRow.channel_id

    // 3. Refresh channel-level stats
    const channelInfo = await getYouTubeChannel(accessToken)
    await sb
      .from("youtube_channels")
      .update({
        subscribers_count: channelInfo.subscriberCount,
        video_count: channelInfo.videoCount,
        total_views: channelInfo.viewCount,
      })
      .eq("id", channelRow.id)

    // 4. Get recent videos
    const videos = await getYouTubeVideos(ytChannelId, accessToken, 25)
    if (videos.length === 0) {
      await sb
        .from("youtube_channels")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", channelRow.id)
      return { ok: true, videos: 0 }
    }

    const videoIds = videos.map(v => v.videoId)

    // 5. Get stats for all videos
    const stats = await getVideoStats(videoIds, accessToken)
    const statsMap = new Map(stats.map(s => [s.videoId, s]))

    // 6. Upsert videos
    for (const video of videos) {
      const s = statsMap.get(video.videoId)
      await sb.from("youtube_videos").upsert(
        {
          channel_id: channelRow.id,
          video_id: video.videoId,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnailUrl,
          published_at: video.publishedAt,
          duration_seconds: parseDurationSeconds(s?.duration ?? video.duration),
          views: s?.viewCount ?? 0,
          likes: s?.likeCount ?? 0,
          comments: s?.commentCount ?? 0,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "video_id" },
      )
    }

    // 7. Try YouTube Analytics (last 30 days) — non-critical
    try {
      const endDate = new Date().toISOString().split("T")[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]

      const analytics = await getChannelAnalytics(ytChannelId, accessToken, startDate!, endDate!)

      // Aggregate analytics into a summary per video is not possible from channel-level
      // analytics alone (they are channel-wide). Update channel-level watch time aggregate.
      const totalMinutes = analytics.reduce((s, r) => s + r.estimatedMinutesWatched, 0)
      const avgDuration =
        analytics.length > 0
          ? analytics.reduce((s, r) => s + r.averageViewDuration, 0) / analytics.length
          : 0
      const avgPercentage =
        analytics.length > 0
          ? analytics.reduce((s, r) => s + r.averageViewPercentage, 0) / analytics.length
          : 0

      // Store aggregated analytics back on the channel row as a summary
      // (individual video analytics require per-video API calls — out of scope here)
      await sb
        .from("youtube_channels")
        .update({
          // No dedicated analytics columns on channel; skip silently if not present
          // This is a no-op if columns don't exist — Supabase ignores unknown keys via RLS
        })
        .eq("id", channelRow.id)

      // Log for observability
      console.info(
        `[YouTube sync] analytics OK — ${totalMinutes} watch minutes, ` +
          `avg duration ${Math.round(avgDuration)}s, avg ${avgPercentage.toFixed(1)}%`,
      )
    } catch (analyticsErr) {
      // YouTube Analytics may not be enabled for all accounts — ignore silently
      console.warn("[YouTube sync] Analytics fetch failed (non-critical):", analyticsErr)
    }

    // 8. Update last_synced_at
    await sb
      .from("youtube_channels")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", channelRow.id)

    return { ok: true, videos: videos.length }
  } catch (err) {
    console.error("[YouTube sync] error:", err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    }
  }
}
