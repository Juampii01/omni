/**
 * GET /api/instagram/audience
 *
 * Trae demografía (gender_age, country, city) + follower/reach history desde la
 * Insights API y la cachea en instagram_account_insights (fila de hoy, columnas
 * jsonb de la migración 020). Si ya se trajo hoy, devuelve el cache.
 *
 * Respuestas:
 *   200 { cached, date, genderAge, country, city, followerHistory, reachHistory }
 *   401 UNAUTHORIZED|TOKEN_EXPIRED · 404 NOT_CONNECTED
 *   422 INSUFFICIENT_FOLLOWERS (<100) · 429 RATE_LIMITED · 502 FETCH_FAILED
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"
import { resolvePrimaryConnection } from "@/lib/instagram/connection"
import { checkRateLimit } from "@/lib/utils/ratelimit"

const GRAPH = "https://graph.instagram.com"
const GRAPH_VERSION = "v23.0"

interface HistoryPoint {
  date: string
  value: number
}

export async function GET(): Promise<NextResponse> {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const rl = await checkRateLimit("instagram:audience", 10, "60 s")
  if (!rl.success) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 })

  const supabase = await createClient()
  const sb = supabase as any

  const connRes = await resolvePrimaryConnection(supabase)
  if (!connRes.ok) {
    const code = connRes.error.kind === "TOKEN_EXPIRED" ? 401 : 404
    return NextResponse.json({ error: connRes.error.kind }, { status: code })
  }
  const { token, accountDbId } = connRes.conn

  // Cache de hoy (UTC)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  const { data: cached } = await sb
    .from("instagram_account_insights")
    .select("period_date, gender_age, country, city, follower_history, reach_history")
    .eq("account_id", accountDbId)
    .eq("period_date", todayStr)
    .maybeSingle()

  if (cached) {
    const fh = Array.isArray(cached.follower_history) ? cached.follower_history : []
    if (fh.length > 0) {
      return NextResponse.json({
        cached: true,
        date: cached.period_date,
        genderAge: cached.gender_age ?? {},
        country: cached.country ?? {},
        city: cached.city ?? {},
        followerHistory: fh,
        reachHistory: cached.reach_history ?? [],
      })
    }
  }

  // Fetch lifetime demographics + day trends
  const since30 = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
  const until0 = Math.floor(Date.now() / 1000)
  const t = encodeURIComponent(token)

  async function igInsights(url: string): Promise<{ ok: boolean; data?: any; message?: string; code?: number }> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
      const json = await res.json().catch(() => null)
      if (!res.ok) return { ok: false, message: json?.error?.message, code: json?.error?.code }
      return { ok: true, data: json }
    } catch (e) {
      return { ok: false, message: String(e) }
    }
  }

  const [demoRes, trendRes] = await Promise.all([
    igInsights(
      `${GRAPH}/${GRAPH_VERSION}/me/insights?metric=audience_gender_age,audience_country,audience_city&period=lifetime&access_token=${t}`,
    ),
    igInsights(
      `${GRAPH}/${GRAPH_VERSION}/me/insights?metric=follower_count,reach&period=day&since=${since30}&until=${until0}&access_token=${t}`,
    ),
  ])

  if (!demoRes.ok) {
    if (demoRes.code === 190) return NextResponse.json({ error: "TOKEN_EXPIRED" }, { status: 401 })
    if ((demoRes.message ?? "").toLowerCase().includes("minimum") || (demoRes.message ?? "").includes("100 follow")) {
      return NextResponse.json({ error: "INSUFFICIENT_FOLLOWERS", detail: demoRes.message }, { status: 422 })
    }
    return NextResponse.json({ error: "FETCH_FAILED", detail: demoRes.message }, { status: 502 })
  }

  // Parse demographics
  const genderAge: Record<string, number> = {}
  const country: Record<string, number> = {}
  const city: Record<string, number> = {}
  for (const item of demoRes.data?.data ?? []) {
    const vals = item.total_value?.breakdowns?.[0]?.results ?? item.values ?? []
    const target = item.name === "audience_gender_age" ? genderAge : item.name === "audience_country" ? country : city
    for (const r of vals) {
      const key = Array.isArray(r.dimension_values) ? r.dimension_values.join(".") : undefined
      if (key) target[key] = r.value ?? 0
      else if (typeof r.value === "object") Object.assign(target, r.value)
    }
  }

  // Parse trends
  const followerHistory: HistoryPoint[] = []
  const reachHistory: HistoryPoint[] = []
  if (trendRes.ok) {
    for (const item of trendRes.data?.data ?? []) {
      const points = item.values ?? []
      const arr = item.name === "follower_count" ? followerHistory : reachHistory
      for (const p of points) {
        arr.push({ date: p.end_time ? p.end_time.slice(0, 10) : "", value: typeof p.value === "number" ? p.value : 0 })
      }
    }
  }

  // Cache
  await sb.from("instagram_account_insights").upsert(
    {
      account_id: accountDbId,
      period_date: todayStr,
      gender_age: genderAge,
      country,
      city,
      follower_history: followerHistory,
      reach_history: reachHistory,
    },
    { onConflict: "account_id,period_date" },
  )

  return NextResponse.json({
    cached: false,
    date: todayStr,
    genderAge,
    country,
    city,
    followerHistory,
    reachHistory,
  })
}
