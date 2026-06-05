/**
 * GET  /api/instagram/publish  → historial + límite real de publicación
 * POST /api/instagram/publish  → publica imagen / reel / carrusel
 *
 * Body POST:
 *   { mediaType: 'IMAGE'|'REEL'|'CAROUSEL', mediaUrls: string[] (HTTPS),
 *     itemTypes?: ('IMAGE'|'VIDEO')[] (solo carrusel), caption?: string }
 *
 * El archivo ya fue subido a Supabase Storage por el cliente; acá solo llegan
 * las URLs públicas y se corre el flujo de containers de Meta (URL pull).
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, getUser } from "@/lib/auth/get-user"
import { resolvePrimaryConnection } from "@/lib/instagram/connection"
import { checkRateLimit } from "@/lib/utils/ratelimit"
import {
  createImageContainer,
  createReelContainer,
  createCarouselContainer,
  createCarouselVideoItem,
  getContainerStatus,
  publishContainer,
  getContentPublishingLimit,
} from "@/lib/instagram/client"

export const maxDuration = 60 // Vercel: margen para procesamiento de video

const BodySchema = z.object({
  mediaType: z.enum(["IMAGE", "REEL", "CAROUSEL"]),
  mediaUrls: z.array(z.string().url().startsWith("https://")).min(1).max(10),
  itemTypes: z.array(z.enum(["IMAGE", "VIDEO"])).optional(),
  caption: z.string().max(2200).optional().default(""),
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Poll de status hasta FINISHED (chequea primero, después espera). Tolera fallos de red. */
async function pollUntilFinished(
  containerId: string,
  token: string,
  deadline: number,
): Promise<{ ok: true } | { ok: false; status: string; error: string }> {
  while (Date.now() < deadline) {
    try {
      const st = await getContainerStatus(containerId, token)
      if (st.status_code === "FINISHED") return { ok: true }
      if (st.status_code === "ERROR" || st.status_code === "EXPIRED") {
        return { ok: false, status: st.status_code, error: st.error_message ?? "" }
      }
      // IN_PROGRESS / PUBLISHED → seguir esperando
    } catch (e) {
      console.error("[publish] poll status error:", e)
    }
    await sleep(3000)
  }
  return { ok: false, status: "TIMEOUT", error: "Timeout esperando el procesamiento del media" }
}

// ── GET: historial + límite real ──────────────────────────────
export async function GET(): Promise<NextResponse> {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const supabase = await createClient()
  const sb = supabase as any

  const { data: acct } = await sb
    .from("instagram_accounts")
    .select("id")
    .eq("is_primary", true)
    .maybeSingle()
  if (!acct) return NextResponse.json({ posts: [], limit: null })

  const { data: rows } = await sb
    .from("instagram_publish_queue")
    .select("id, media_type, caption, status, ig_media_id, published_at, last_error, created_at")
    .eq("account_id", acct.id)
    .order("created_at", { ascending: false })
    .limit(20)

  const posts = ((rows ?? []) as Array<Record<string, any>>).map((p) => ({
    id: p.id,
    mediaType: p.media_type,
    caption: p.caption,
    status: p.status === "published" ? "PUBLISHED" : p.status === "failed" ? "FAILED" : "PENDING",
    postId: p.ig_media_id ?? null,
    permalink: null,
    createdAt: p.created_at,
    errorMessage: p.last_error ?? null,
  }))

  // Límite real de Meta (best-effort)
  let limit: { quota_usage: number; quota_total: number } | null = null
  const connRes = await resolvePrimaryConnection(supabase)
  if (connRes.ok) {
    limit = await getContentPublishingLimit(connRes.conn.token)
  }

  return NextResponse.json({ posts, limit })
}

// ── POST: publicar ────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: parsed.error.flatten() }, { status: 400 })
  }
  const { mediaType, mediaUrls, itemTypes, caption } = parsed.data

  // Validación de forma según el tipo
  if (mediaType === "CAROUSEL") {
    if (mediaUrls.length < 2) return NextResponse.json({ error: "VALIDATION_ERROR", detail: "El carrusel necesita 2-10 items" }, { status: 400 })
    if (!itemTypes || itemTypes.length !== mediaUrls.length) {
      return NextResponse.json({ error: "VALIDATION_ERROR", detail: "itemTypes debe coincidir con mediaUrls" }, { status: 400 })
    }
  } else if (mediaUrls.length !== 1) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: "Imagen/Reel acepta una sola URL" }, { status: 400 })
  }

  const rl = await checkRateLimit("instagram:publish", 5, "60 s")
  if (!rl.success) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 })

  const supabase = await createClient()
  const sb = supabase as any
  const userId = (await getUser())?.id ?? null

  const connRes = await resolvePrimaryConnection(supabase)
  if (!connRes.ok) {
    const code = connRes.error.kind === "TOKEN_EXPIRED" ? 401 : 404
    return NextResponse.json({ error: connRes.error.kind }, { status: code })
  }
  const { token, igUserId, accountDbId } = connRes.conn

  // Límite duro de Meta (un carrusel cuenta como 1)
  const limit = await getContentPublishingLimit(token)
  if (limit && limit.quota_usage >= limit.quota_total) {
    return NextResponse.json(
      { error: "DAILY_LIMIT_REACHED", detail: `Límite de Instagram alcanzado (${limit.quota_usage}/${limit.quota_total} en 24h)` },
      { status: 429 },
    )
  }

  // Registrar en la cola (idempotencia + auditoría)
  const { data: queueRow } = await sb
    .from("instagram_publish_queue")
    .insert({
      account_id: accountDbId,
      media_type: mediaType,
      caption,
      media_urls: mediaUrls,
      scheduled_for: new Date().toISOString(),
      publish_now: true,
      status: "processing",
      created_by: userId,
    })
    .select("id")
    .maybeSingle()
  const queueId: string | null = queueRow?.id ?? null

  async function fail(detail: string, code = "FETCH_FAILED", status = 502) {
    console.error(`[publish] ${code}: ${detail}`)
    if (queueId) {
      await sb.from("instagram_publish_queue").update({ status: "failed", last_error: detail }).eq("id", queueId)
    }
    return NextResponse.json({ error: code, detail }, { status })
  }

  const deadline = Date.now() + 50_000 // dejar margen bajo maxDuration=60s

  // ── Construir el container final a publicar ───────────────────
  let finalContainerId: string
  try {
    if (mediaType === "IMAGE") {
      const id = await createImageContainer(igUserId, token, mediaUrls[0], caption)
      const st = await pollUntilFinished(id, token, deadline)
      if (!st.ok) return fail(`${st.status}: ${st.error}`, "CONTAINER_FAILED")
      finalContainerId = id
    } else if (mediaType === "REEL") {
      const id = await createReelContainer(igUserId, token, mediaUrls[0], caption)
      const st = await pollUntilFinished(id, token, deadline)
      if (!st.ok) return fail(`${st.status}: ${st.error}`, st.status === "TIMEOUT" ? "PUBLISH_TIMEOUT" : "CONTAINER_FAILED")
      finalContainerId = id
    } else {
      // CARRUSEL: item containers → poll → container de carrusel → poll
      const itemIds: string[] = []
      for (let i = 0; i < mediaUrls.length; i++) {
        const isVideo = itemTypes![i] === "VIDEO"
        const itemId = isVideo
          ? await createCarouselVideoItem(igUserId, token, mediaUrls[i])
          : await createImageContainer(igUserId, token, mediaUrls[i], undefined, true)
        // los videos necesitan procesarse; las imágenes suelen estar listas
        const st = await pollUntilFinished(itemId, token, deadline)
        if (!st.ok) return fail(`item ${i + 1} ${st.status}: ${st.error}`, st.status === "TIMEOUT" ? "PUBLISH_TIMEOUT" : "CONTAINER_FAILED")
        itemIds.push(itemId)
      }
      const carouselId = await createCarouselContainer(igUserId, token, itemIds, caption)
      const st = await pollUntilFinished(carouselId, token, deadline)
      if (!st.ok) return fail(`carrusel ${st.status}: ${st.error}`, st.status === "TIMEOUT" ? "PUBLISH_TIMEOUT" : "CONTAINER_FAILED")
      finalContainerId = carouselId
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), "CONTAINER_FAILED")
  }

  // ── Publicar (una sola vez) ───────────────────────────────────
  let publishedId: string
  try {
    publishedId = await publishContainer(igUserId, token, finalContainerId)
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), "PUBLISH_FAILED")
  }

  const now = new Date().toISOString()
  if (queueId) {
    await sb
      .from("instagram_publish_queue")
      .update({ status: "published", ig_media_id: publishedId, published_at: now })
      .eq("id", queueId)
  }

  return NextResponse.json({
    post: { id: queueId, mediaType, caption, status: "PUBLISHED", postId: publishedId, createdAt: now },
  })
}
