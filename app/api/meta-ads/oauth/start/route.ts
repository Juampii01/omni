import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { buildMetaAdsOAuthURL } from "@/lib/meta-ads/client"
import { randomBytes } from "crypto"
import { cookies } from "next/headers"

export async function GET() {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const state = randomBytes(16).toString("hex")
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/meta-ads/oauth/callback`
  const url = buildMetaAdsOAuthURL(redirectUri, state)

  // Guardar state en cookie para validación CSRF en el callback
  const cookieStore = await cookies()
  cookieStore.set("meta_ads_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutos
    path: "/",
    sameSite: "lax",
  })

  return NextResponse.redirect(url)
}
