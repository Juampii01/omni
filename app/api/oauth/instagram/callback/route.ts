import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"
import { consumeOAuthState } from "@/lib/omni/oauth-state"
import { exchangeInstagramCode, instagramCallbackUrl } from "@/lib/omni/instagram-oauth"
import { encryptToken } from "@/lib/crypto"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")
  const redirectBase = process.env.NEXT_PUBLIC_APP_URL ?? url.origin

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${redirectBase}/dashboard/settings?instagram_error=${encodeURIComponent(oauthError ?? "missing_code")}`)
  }

  const clientId = await consumeOAuthState(state, "instagram")
  if (!clientId) {
    return NextResponse.redirect(`${redirectBase}/dashboard/settings?instagram_error=invalid_state`)
  }

  try {
    const { token, profile } = await exchangeInstagramCode(code, instagramCallbackUrl(req))
    const supabase = createServiceClient()
    const { error } = await supabase.from("client_config").upsert({
      client_id: clientId,
      ig_account_id: profile.accountId,
      ig_account_username: profile.accountName,
      ig_access_token: encryptToken(token.accessToken),
      ig_scopes: "instagram_business_basic,instagram_business_manage_insights,instagram_business_manage_messages",
      ig_connected_at: new Date().toISOString(),
    })
    if (error) throw new Error(error.message)
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown"
    console.error("[oauth/instagram/callback]", message)
    return NextResponse.redirect(`${redirectBase}/dashboard/settings?instagram_error=${encodeURIComponent(message.slice(0, 200))}`)
  }

  return NextResponse.redirect(`${redirectBase}/dashboard/settings?connected=instagram`)
}
