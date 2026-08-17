import { NextRequest, NextResponse } from "next/server"
import { requireInternal, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { decryptToken, encryptToken } from "@/lib/crypto"
import { fetchYouTubeChannel, fetchYouTubeVideos, refreshYouTubeToken } from "@/lib/omni/youtube-oauth"

export async function GET(req: NextRequest) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("client_config")
    .select("yt_access_token, yt_refresh_token, yt_token_expires_at, yt_connected_at")
    .eq("client_id", ctx.clientId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.yt_connected_at || !data.yt_access_token) return NextResponse.json({ connected: false })

  try {
    let accessToken = decryptToken(data.yt_access_token)
    const expiresAt = data.yt_token_expires_at ? new Date(data.yt_token_expires_at).getTime() : 0

    // Renovamos si el access_token venció (o le queda <60s) y tenemos refresh_token.
    if (data.yt_refresh_token && expiresAt < Date.now() + 60_000) {
      const refreshed = await refreshYouTubeToken(decryptToken(data.yt_refresh_token))
      accessToken = refreshed.accessToken
      await supabase
        .from("client_config")
        .update({ yt_access_token: encryptToken(accessToken), yt_token_expires_at: refreshed.expiresAt?.toISOString() ?? null })
        .eq("client_id", ctx.clientId)
    }

    const channel = await fetchYouTubeChannel(accessToken)
    const videos = channel.uploadsPlaylistId ? await fetchYouTubeVideos(accessToken, channel.uploadsPlaylistId, 10) : []
    return NextResponse.json({ connected: true, channel, videos })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown"
    console.error("[omni/youtube/metrics]", message)
    return NextResponse.json({ error: message.slice(0, 200) }, { status: 502 })
  }
}
