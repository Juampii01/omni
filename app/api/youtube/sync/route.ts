import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { syncYouTubeChannel } from "@/lib/youtube/sync"

export async function POST() {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const result = await syncYouTubeChannel()

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 })
  }

  return NextResponse.json(result)
}
