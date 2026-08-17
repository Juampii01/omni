import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"
import { consumeOAuthState } from "@/lib/omni/oauth-state"
import { exchangeYouTubeCode, youtubeCallbackUrl, fetchYouTubeChannel, YT_SCOPE } from "@/lib/omni/youtube-oauth"
import { encryptToken } from "@/lib/crypto"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")
  const redirectBase = process.env.NEXT_PUBLIC_APP_URL ?? url.origin
  const dest = (q: string) => `${redirectBase}/dashboard/youtube?${q}`

  if (oauthError || !code || !state) {
    return NextResponse.redirect(dest(`youtube_error=${encodeURIComponent(oauthError ?? "missing_code")}`))
  }

  const clientId = await consumeOAuthState(state, "youtube")
  if (!clientId) return NextResponse.redirect(dest("youtube_error=invalid_state"))

  try {
    const token = await exchangeYouTubeCode(code, youtubeCallbackUrl(req))
    const channel = await fetchYouTubeChannel(token.accessToken)
    const supabase = createServiceClient()

    const update: Record<string, unknown> = {
      client_id: clientId,
      yt_channel_id: channel.channelId,
      yt_channel_title: channel.title,
      yt_access_token: encryptToken(token.accessToken),
      yt_token_expires_at: token.expiresAt?.toISOString() ?? null,
      yt_scopes: token.scope ?? YT_SCOPE,
      yt_connected_at: new Date().toISOString(),
    }
    // refresh_token solo llega la primera vez (o con prompt=consent). Nunca lo
    // pisamos con null si esta vez no vino — nos quedaríamos sin poder renovar.
    if (token.refreshToken) update.yt_refresh_token = encryptToken(token.refreshToken)

    const { error } = await supabase.from("client_config").upsert(update)
    if (error) throw new Error(error.message)
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown"
    console.error("[oauth/youtube/callback]", message)
    return NextResponse.redirect(dest(`youtube_error=${encodeURIComponent(message.slice(0, 200))}`))
  }

  return NextResponse.redirect(dest("connected=youtube"))
}
