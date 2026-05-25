/**
 * POST /api/cron/daily-sync
 *
 * Cron unificado que sincroniza todas las integraciones activas:
 * 1. Instagram — perfil + media + insights
 * 2. Meta Ads  — campañas + insights (si hay cuenta conectada)
 * 3. YouTube   — canal + videos (si hay canal conectado)
 *
 * Vercel Hobby soporta 1 cron diario. Ver vercel.json:
 * { "path": "/api/cron/daily-sync", "schedule": "0 8 * * *" }
 *
 * Para triggers manuales individuales:
 * - POST /api/cron/instagram-sync
 * - POST /api/meta-ads/sync
 */

import { NextRequest, NextResponse } from "next/server"
import { syncInstagramAccount }  from "@/lib/instagram/sync"
import { syncMetaAdsAccount }    from "@/lib/meta-ads/sync"
import { syncYouTubeChannel }    from "@/lib/youtube/sync"

export async function POST(req: NextRequest) {
  // CRON_SECRET is mandatory
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error("CRITICAL: CRON_SECRET not configured — refusing request")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Record<string, unknown> = {}
  const startedAt = new Date().toISOString()

  // ── 1. Instagram ──────────────────────────────────────────
  try {
    const ig = await syncInstagramAccount()
    results.instagram = ig
    if (!ig.ok) console.warn("daily-sync: instagram sync failed:", ig.error)
    else console.log("daily-sync: instagram ✅")
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    results.instagram = { ok: false, error: msg }
    console.error("daily-sync: instagram ❌", msg)
  }

  // ── 2. Meta Ads ───────────────────────────────────────────
  try {
    const ads = await syncMetaAdsAccount()
    results.meta_ads = ads
    if (!ads.ok) console.warn("daily-sync: meta_ads sync failed:", ads.error)
    else console.log(`daily-sync: meta_ads ✅ (${ads.campaigns} campaigns, ${ads.insights} insights)`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    results.meta_ads = { ok: false, error: msg }
    console.error("daily-sync: meta_ads ❌", msg)
  }

  // ── 3. YouTube ────────────────────────────────────────────
  try {
    const yt = await syncYouTubeChannel()
    results.youtube = yt
    if (!yt.ok) console.warn("daily-sync: youtube sync failed:", yt.error)
    else console.log(`daily-sync: youtube ✅ (${yt.videos} videos)`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    results.youtube = { ok: false, error: msg }
    console.error("daily-sync: youtube ❌", msg)
  }

  return NextResponse.json({
    ok: true,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    results,
  })
}
