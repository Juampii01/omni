import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { exchangeMetaAdsCode, getAdAccounts } from "@/lib/meta-ads/client"
import { encrypt } from "@/lib/crypto"
import { createServiceClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try { user = await requireAuth() } catch {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?error=unauthorized`)
  }

  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const errorParam = searchParams.get("error")

  if (errorParam) {
    return NextResponse.redirect(
      `${APP_URL}/settings/integrations?error=${encodeURIComponent(errorParam)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?error=no_code`)
  }

  // Validación CSRF
  const cookieStore = await cookies()
  const savedState = cookieStore.get("meta_ads_oauth_state")?.value
  cookieStore.delete("meta_ads_oauth_state")

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/settings/integrations?error=state_mismatch`)
  }

  try {
    const redirectUri = `${APP_URL}/api/meta-ads/oauth/callback`

    // 1. Canjear code por access_token (long-lived, 60 días)
    const accessToken = await exchangeMetaAdsCode(code, redirectUri)

    // 2. Obtener cuentas publicitarias del usuario
    const accounts = await getAdAccounts(accessToken)

    // 3. Elegir la primera cuenta activa (account_status = 1)
    const activeAccount = accounts.find(a => a.account_status === 1)

    if (!activeAccount) {
      return NextResponse.redirect(
        `${APP_URL}/settings/integrations?error=no_ad_account`
      )
    }

    // 4. Encriptar token
    const access_token_enc = encrypt(accessToken)

    // Token expira en 60 días
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    // 5. Upsert en meta_ads_accounts
    const supabase = await createServiceClient()
    const sb = supabase as any

    const { error: upsertErr } = await sb
      .from("meta_ads_accounts")
      .upsert(
        {
          user_id: user.id,
          meta_account_id: activeAccount.id,
          account_name: activeAccount.name,
          currency: activeAccount.currency,
          timezone_name: activeAccount.timezone_name,
          access_token_enc,
          token_expires_at: tokenExpiresAt,
          is_active: true,
        },
        { onConflict: "meta_account_id" }
      )

    if (upsertErr) throw upsertErr

    return NextResponse.redirect(`${APP_URL}/settings/integrations?connected=meta-ads`)
  } catch (err) {
    console.error("Meta Ads OAuth callback error:", err)
    const msg = err instanceof Error ? err.message : "unknown"
    return NextResponse.redirect(
      `${APP_URL}/settings/integrations?error=${encodeURIComponent(msg)}`
    )
  }
}
