import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { buildYouTubeOAuthURL } from "@/lib/youtube/client"
import { randomBytes } from "crypto"
import { cookies } from "next/headers"

export async function GET() {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const state = randomBytes(16).toString("hex")
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/oauth/callback`
  const url = buildYouTubeOAuthURL(redirectUri, state)

  // Store state in cookie for CSRF validation on callback
  const cookieStore = await cookies()
  cookieStore.set("yt_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    path: "/",
    sameSite: "lax",
  })

  return NextResponse.redirect(url)
}
