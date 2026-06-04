/**
 * GET  /api/instagram/publish  → últimas publicaciones (instagram_publish_queue)
 * POST /api/instagram/publish  → publica una imagen o reel
 *
 * Body POST: { mediaType: 'IMAGE' | 'REEL', mediaUrl: string (HTTPS), caption?: string }
 * Flujo: crear contenedor → poll status (reels) → publicar → persistir.
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
  getContainerStatus,
  publishContainer,
} from "@/lib/instagram/client"

export const maxDuration = 60 // Vercel: permitir procesamiento de video

const BodySchema = z.object({
  mediaType: z.enum(["IMAGE", "REEL"]),
  mediaUrl: z.string().url().startsWith("https://"),
  caption: z.string().max(2200).optional().default(""),
})

// ── GET: historial ────────────────────────────────────────────
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
  if (!acct) return NextResponse.json({ posts: [] })

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

  return NextResponse.json({ posts })
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
  const { mediaType, mediaUrl, caption } = parsed.data

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

  // Persistir como pending
  const { data: queueRow } = await sb
    .from("instagram_publish_queue")
    .insert({
      account_id: accountDbId,
      media_type: mediaType,
      caption,
      media_urls: [mediaUrl],
      scheduled_for: new Date().toISOString(),
      publish_now: true,
      status: "processing",
      created_by: userId,
    })
    .select("id")
    .maybeSingle()
  const queueId: string | null = queueRow?.id ?? null

  async function fail(detail: string, status = 502, code = "FETCH_FAILED") {
    if (queueId) {
      await sb.from("instagram_publish_queue").update({ status: "failed", last_error: detail }).eq("id", queueId)
    }
    return NextResponse.json({ error: code, detail }, { status })
  }

  // Paso 1: crear contenedor
  let containerId: string
  try {
    containerId =
      mediaType === "IMAGE"
        ? await createImageContainer(igUserId, token, mediaUrl, caption)
        : await createReelContainer(igUserId, token, mediaUrl, caption)
  } catch (e) {
    return fail(String(e), 502, "CONTAINER_FAILED")
  }

  // Paso 2: poll status (reels tardan; imágenes suelen estar listas)
  const MAX_POLLS = 10
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    try {
      const st = await getContainerStatus(containerId, token)
      if (st.status_code === "FINISHED") break
      if (st.status_code === "ERROR" || st.status_code === "EXPIRED") {
        return fail(`Container status: ${st.status_code}`, 502, "CONTAINER_FAILED")
      }
    } catch {
      // tolerar fallos de red puntuales del poll
    }
    if (i === MAX_POLLS - 1) {
      return fail("Timeout esperando el contenedor", 502, "PUBLISH_TIMEOUT")
    }
  }

  // Paso 3: publicar
  let publishedId: string
  try {
    publishedId = await publishContainer(igUserId, token, containerId)
  } catch (e) {
    return fail(String(e), 502, "PUBLISH_FAILED")
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
