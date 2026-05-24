import { NextRequest, NextResponse } from "next/server"
import { syncInstagramAccount } from "@/lib/instagram/sync"

// Called by Vercel cron (see vercel.json) every 6 hours.
// Secured by CRON_SECRET header that Vercel injects automatically.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await syncInstagramAccount()

  if (!result.ok) {
    console.error("instagram-sync cron failed:", result.error)
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, synced_at: new Date().toISOString() })
}
