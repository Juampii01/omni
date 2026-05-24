import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { exchangeCodeForToken, getLongLivedToken, getPages, getIGProfile } from "@/lib/instagram/client"
import { encrypt } from "@/lib/crypto"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  try { await requireAuth() } catch {
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

    // 1. Exchange code → short-lived token
    const shortToken = await exchangeCodeForToken(code, redirectUri)

    // 2. Exchange → long-lived token (60 days)
    const { access_token: longToken, expires_in } = await getLongLivedToken(shortToken)

    // 3. Get FB pages → find the one with an IG Business Account
    const pages = await getPages(longToken)
    const pageWithIG = pages.find(p => p.instagram_business_account?.id)

    if (!pageWithIG || !pageWithIG.instagram_business_account) {
      return NextResponse.redirect(`${APP_URL}/settings?ig_error=no_ig_business_account`)
    }

    const pageToken = pageWithIG.access_token
    const igUserId = pageWithIG.instagram_business_account.id

    // 4. Get IG profile
    const profile = await getIGProfile(igUserId, pageToken)

    // 5. Encrypt tokens
    const encryptedPageToken = encrypt(pageToken)
    const encryptedUserToken = encrypt(longToken)

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    const supabase = await createClient()

    // 6. Upsert into integrations (stores encrypted tokens)
    const { data: integration, error: intErr } = await (supabase as any)
      .from("integrations")
      .upsert(
        {
          provider: "instagram",
          account_name: profile.username,
          account_id: igUserId,
          access_token_encrypted: encryptedPageToken,
          refresh_token_encrypted: encryptedUserToken,
          expires_at: expiresAt,
          scopes: [
            "instagram_basic",
            "instagram_content_publish",
            "instagram_manage_comments",
            "instagram_manage_insights",
            "pages_show_list",
            "pages_read_engagement",
          ],
          metadata: { page_id: pageWithIG.id, page_name: pageWithIG.name },
          is_active: true,
        },
        { onConflict: "provider,account_id" }
      )
      .select("id")
      .single()

    if (intErr) throw intErr

    // 7. Upsert into instagram_accounts
    await (supabase as any)
      .from("instagram_accounts")
      .upsert(
        {
          integration_id: integration.id,
          ig_user_id: igUserId,
          username: profile.username,
          name: profile.name,
          biography: profile.biography,
          website: profile.website,
          profile_picture_url: profile.profile_picture_url,
          followers_count: profile.followers_count,
          follows_count: profile.follows_count,
          media_count: profile.media_count,
          is_primary: true,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "ig_user_id" }
      )

    return NextResponse.redirect(`${APP_URL}/settings?ig_connected=1`)
  } catch (err) {
    console.error("IG OAuth callback error:", err)
    const msg = err instanceof Error ? err.message : "unknown"
    return NextResponse.redirect(`${APP_URL}/settings?ig_error=${encodeURIComponent(msg)}`)
  }
}
