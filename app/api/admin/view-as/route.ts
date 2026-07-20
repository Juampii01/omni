import { NextRequest, NextResponse } from "next/server"
import { requirePlatformAdmin } from "@/lib/auth/api-guards"

const VIEW_AS_COOKIE = "omni_view_as"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export async function POST(req: NextRequest) {
  const ctx = await requirePlatformAdmin(getJwt(req))
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { clientId } = await req.json()
  if (!clientId) return NextResponse.json({ error: "clientId es obligatorio" }, { status: 400 })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(VIEW_AS_COOKIE, clientId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  })
  return res
}

export async function DELETE(req: NextRequest) {
  const ctx = await requirePlatformAdmin(getJwt(req))
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const res = NextResponse.json({ ok: true })
  res.cookies.delete(VIEW_AS_COOKIE)
  return res
}
