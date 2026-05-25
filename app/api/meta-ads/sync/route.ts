import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/get-user"
import { syncMetaAdsAccount } from "@/lib/meta-ads/sync"

export async function POST() {
  try { await requireRole("owner", "admin") } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const result = await syncMetaAdsAccount()

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    campaigns: result.campaigns,
    insights: result.insights,
  })
}
