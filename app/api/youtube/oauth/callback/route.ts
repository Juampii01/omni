import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { exchangeYouTubeCode, getYouTubeChannel } from "@/lib/youtube/client"
import { encrypt } from "@/lib/crypto"
import { createServiceClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try { user = await requireAuth() } catch {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?yt_error=unauthorized`)
  }

  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.redirect(
      `${APP_URL}/settings/integrations?yt_error=${encodeURIComponent(error)}`,
    )
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?yt_error=no_code`)
  }

  // CSRF check
  const cookieStore = await cookies()
  const savedState = cookieStore.get("yt_oauth_state")?.value
  cookieStore.delete("yt_oauth_state")

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?yt_error=state_mismatch`)
  }

  try {
    const redirectUri = `${APP_URL}/api/youtube/oauth/callback`

    // 1. Exchange code → tokens
    const { access_token, refresh_token, expires_in } = await exchangeYouTubeCode(code, redirectUri)

    // 2. Get channel info
    const channel = await getYouTubeChannel(access_token)

    // 3. Encrypt tokens
    const access_token_enc = encrypt(access_token)
    const refresh_token_enc = encrypt(refresh_token)
    const token_expires_at = new Date(Date.now() + expires_in * 1000).toISOString()

    // 4. Upsert into youtube_channels
    const supabase = await createServiceClient()

    const { error: upsertErr } = await (supabase as any)
      .from("youtube_channels")
      .upsert(
        {
          user_id: user.id,
          channel_id: channel.id,
          channel_title: channel.title,
          custom_url: channel.customUrl,
          description: channel.description,
          thumbnail_url: channel.thumbnailUrl,
          access_token_enc,
          refresh_token_enc,
          token_expires_at,
          subscribers_count: channel.subscriberCount,
          video_count: channel.videoCount,
          total_views: channel.viewCount,
          is_active: true,
        },
        { onConflict: "channel_id" },
      )

    if (upsertErr) throw upsertErr

    return NextResponse.redirect(`${APP_URL}/settings/integrations?connected=youtube`)
  } catch (err) {
    console.error("YouTube OAuth callback error:", err)
    const msg = err instanceof Error ? err.message : "unknown"
    return NextResponse.redirect(
      `${APP_URL}/settings/integrations?yt_error=${encodeURIComponent(msg)}`,
    )
  }
}
