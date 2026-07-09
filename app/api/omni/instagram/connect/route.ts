import { NextRequest, NextResponse } from "next/server"
import { requireInternal } from "@/lib/auth/api-guards"
import { buildInstagramOAuthUrl } from "@/lib/omni/instagram-oauth"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export async function POST(req: NextRequest) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const url = await buildInstagramOAuthUrl(ctx.clientId, req)
  if (!url) return NextResponse.json({ error: "Falta INSTAGRAM_APP_ID en el servidor" }, { status: 503 })

  return NextResponse.json({ url })
}
