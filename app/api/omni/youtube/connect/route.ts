import { NextRequest, NextResponse } from "next/server"
import { requireInternal, getJwt } from "@/lib/auth/api-guards"
import { buildYouTubeOAuthUrl } from "@/lib/omni/youtube-oauth"

export async function POST(req: NextRequest) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const url = await buildYouTubeOAuthUrl(ctx.clientId, req)
  if (!url) return NextResponse.json({ error: "Falta GOOGLE_CLIENT_ID en el servidor" }, { status: 503 })

  return NextResponse.json({ url })
}
