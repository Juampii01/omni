/**
 * POST /api/instagram/comments/reply
 * Body: { commentId: string (ig_comment_id), message: string }
 *
 * Publica una respuesta a un comentario vía Graph API y la persiste.
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"
import { resolvePrimaryConnection } from "@/lib/instagram/connection"
import { checkRateLimit } from "@/lib/utils/ratelimit"

const GRAPH = "https://graph.instagram.com"
const GRAPH_VERSION = "v23.0"

const BodySchema = z.object({
  commentId: z.string().min(1),
  message: z.string().min(1).max(2200),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "MISSING_FIELDS", detail: parsed.error.flatten() }, { status: 400 })
  }
  const { commentId, message } = parsed.data

  const rl = await checkRateLimit("instagram:comments:reply", 10, "60 s")
  if (!rl.success) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 })

  const supabase = await createClient()
  const sb = supabase as any

  const connRes = await resolvePrimaryConnection(supabase)
  if (!connRes.ok) {
    const code = connRes.error.kind === "TOKEN_EXPIRED" ? 401 : 404
    return NextResponse.json({ error: connRes.error.kind }, { status: code })
  }
  const token = connRes.conn.token

  // El comentario padre debe existir en DB (y nos da media_id)
  const { data: parent } = await sb
    .from("instagram_comments")
    .select("id, media_id")
    .eq("ig_comment_id", commentId)
    .maybeSingle()
  if (!parent) return NextResponse.json({ error: "COMMENT_NOT_FOUND" }, { status: 404 })

  // POST /{comment-id}/replies
  let newReplyId: string | null = null
  try {
    const res = await fetch(`${GRAPH}/${GRAPH_VERSION}/${commentId}/replies`, {
      method: "POST",
      body: new URLSearchParams({ message, access_token: token }),
      signal: AbortSignal.timeout(12_000),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const code = json?.error?.code
      if (code === 190) return NextResponse.json({ error: "TOKEN_EXPIRED" }, { status: 401 })
      return NextResponse.json({ error: "FETCH_FAILED", detail: json?.error?.message }, { status: 502 })
    }
    newReplyId = json?.id ?? null
  } catch (e) {
    return NextResponse.json({ error: "FETCH_FAILED", detail: String(e) }, { status: 502 })
  }

  if (!newReplyId) return NextResponse.json({ error: "FETCH_FAILED", detail: "No reply ID" }, { status: 502 })

  const now = new Date().toISOString()
  await sb.from("instagram_comments").upsert(
    {
      media_id: parent.media_id,
      ig_comment_id: newReplyId,
      username: connRes.conn.username ?? "",
      text: message,
      timestamp: now,
      like_count: 0,
      is_hidden: false,
      parent_id: parent.id,
      replied_at: now,
    },
    { onConflict: "ig_comment_id" },
  )

  return NextResponse.json({
    comment: { id: newReplyId, igCommentId: newReplyId, text: message, timestamp: now, parentId: parent.id },
  })
}
