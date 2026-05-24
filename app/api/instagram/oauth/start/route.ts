import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { buildOAuthURL } from "@/lib/instagram/client"
import { randomBytes } from "crypto"
import { cookies } from "next/headers"

export async function GET() {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const state = randomBytes(16).toString("hex")
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/oauth/callback`
  const url = buildOAuthURL(redirectUri, state)

  // Store state in cookie for CSRF validation on callback
  const cookieStore = await cookies()
  cookieStore.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    path: "/",
    sameSite: "lax",
  })

  return NextResponse.redirect(url)
}
