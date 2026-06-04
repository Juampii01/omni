/**
 * DELETE /api/instagram/comments/[id]
 * [id] = instagram_comments.id (uuid interno)
 *
 * Oculta el comentario en Instagram (hide=true) y lo marca is_hidden=true
 * en DB. Oculta en vez de borrar para preservar el contexto del hilo.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"
import { resolvePrimaryConnection } from "@/lib/instagram/connection"
import { checkRateLimit } from "@/lib/utils/ratelimit"

const GRAPH = "https://graph.instagram.com"
const GRAPH_VERSION = "v23.0"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const { id } = await params

  const rl = await checkRateLimit("instagram:comments:hide", 20, "60 s")
  if (!rl.success) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 })

  const supabase = await createClient()
  const sb = supabase as any

  const { data: comment } = await sb
    .from("instagram_comments")
    .select("id, ig_comment_id")
    .eq("id", id)
    .maybeSingle()
  if (!comment) return NextResponse.json({ error: "COMMENT_NOT_FOUND" }, { status: 404 })

  const connRes = await resolvePrimaryConnection(supabase)
  if (!connRes.ok) {
    const code = connRes.error.kind === "TOKEN_EXPIRED" ? 401 : 404
    return NextResponse.json({ error: connRes.error.kind }, { status: code })
  }
  const token = connRes.conn.token

  // POST /{comment-id}?hide=true
  try {
    const res = await fetch(`${GRAPH}/${GRAPH_VERSION}/${comment.ig_comment_id}`, {
      method: "POST",
      body: new URLSearchParams({ hide: "true", access_token: token }),
      signal: AbortSignal.timeout(12_000),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const code = json?.error?.code
      if (code === 190) return NextResponse.json({ error: "TOKEN_EXPIRED" }, { status: 401 })
      return NextResponse.json({ error: "FETCH_FAILED", detail: json?.error?.message }, { status: 502 })
    }
  } catch (e) {
    return NextResponse.json({ error: "FETCH_FAILED", detail: String(e) }, { status: 502 })
  }

  await sb.from("instagram_comments").update({ is_hidden: true }).eq("id", id)

  return NextResponse.json({ ok: true })
}
