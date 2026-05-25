import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { exchangeCodeForToken, getLongLivedToken, getIGAccountDirect } from "@/lib/instagram/client"
import { encrypt } from "@/lib/crypto"
import { createServiceClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try { user = await requireAuth() } catch {
    return NextResponse.redirect(`${APP_URL}/settings?ig_error=unauthorized`)
  }

  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.redirect(`${APP_URL}/settings?ig_error=${encodeURIComponent(error)}`)
  }
  if (!code) {
    return NextResponse.redirect(`${APP_URL}/settings?ig_error=no_code`)
  }

  // CSRF check
  const cookieStore = await cookies()
  const savedState = cookieStore.get("ig_oauth_state")?.value
  cookieStore.delete("ig_oauth_state")

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/settings?ig_error=state_mismatch`)
  }

  try {
    const redirectUri = `${APP_URL}/api/instagram/oauth/callback`

    // 1. Exchange code → short-lived token + user_id
    const { access_token: shortToken, user_id: igUserId } = await exchangeCodeForToken(code, redirectUri)

    // 2. Try to exchange short-lived → long-lived (60 días). Non-blocking:
    //    if this fails (e.g. app not yet approved for exchange), proceed with
    //    the short-lived token — the profile fetch still works with it.
    let token = shortToken
    let expiresIn = 3600 // short-lived = 1h fallback
    try {
      const ll = await getLongLivedToken(shortToken)
      token = ll.access_token
      expiresIn = ll.expires_in
      console.log(`✓ Long-lived token obtained, expires in ${Math.round(expiresIn / 86400)}d`)
    } catch (llErr) {
      console.warn("Long-lived token exchange failed (using short-lived):", llErr)
    }

    // 3. Fetch IG profile — endpoint: graph.instagram.com/{user_id}
    let igProfile: Awaited<ReturnType<typeof getIGAccountDirect>> | null = null
    try {
      igProfile = await getIGAccountDirect(token, igUserId)
    } catch (profileErr) {
      console.warn("IG profile fetch failed (will sync later):", profileErr)
    }

    const encryptedToken = encrypt(token)
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
    const username = igProfile?.username ?? `ig_${igUserId}`

    // Use service client to bypass RLS for all writes (synchronous — no cookies)
    const supabase = createServiceClient()
    const sb = supabase as any

    // 3. Upsert integration
    const { data: integration, error: intErr } = await sb
      .from("integrations")
      .upsert(
        {
          provider: "instagram",
          account_name: username,
          account_id: igUserId,
          access_token_encrypted: encryptedToken,
          refresh_token_encrypted: encryptedToken,
          expires_at: expiresAt,
          scopes: [
            "instagram_business_basic",
            "instagram_business_content_publish",
            "instagram_business_manage_comments",
            "instagram_business_manage_insights",
            "instagram_business_manage_messages",
          ],
          metadata: {},
          is_active: true,
          created_by: user.id,
        },
        { onConflict: "provider,account_id" }
      )
      .select("id")
      .single()

    if (intErr) {
      console.error("integrations upsert error:", intErr)
      throw intErr
    }

    // 4. Upsert instagram_accounts — with full error logging
    const { error: igErr } = await sb
      .from("instagram_accounts")
      .upsert(
        {
          integration_id: integration.id,
          user_id: user.id,
          ig_user_id: igUserId,
          username,
          name: igProfile?.name ?? username,
          biography: igProfile?.biography ?? null,
          website: igProfile?.website ?? null,
          profile_picture_url: igProfile?.profile_picture_url ?? null,
          followers_count: igProfile?.followers_count ?? 0,
          follows_count: igProfile?.follows_count ?? 0,
          media_count: igProfile?.media_count ?? 0,
          is_primary: true,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "ig_user_id" }
      )

    if (igErr) {
      console.error("instagram_accounts upsert error:", igErr)
      throw igErr
    }

    console.log(`✓ Instagram connected: @${username} (${igUserId}) for user ${user.id}`)

    return NextResponse.redirect(`${APP_URL}/settings/integrations?connected=instagram`)
  } catch (err) {
    console.error("IG OAuth callback error:", err)
    const msg = err instanceof Error ? err.message : "unknown"
    return NextResponse.redirect(`${APP_URL}/settings?ig_error=${encodeURIComponent(msg)}`)
  }
}
