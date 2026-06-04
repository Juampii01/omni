/**
 * GET /api/instagram/comments?mediaId=<ig_media_id>
 *
 * Sincroniza los comentarios top-level + respuestas de una media desde la
 * Graph API, hace upsert en instagram_comments y los devuelve.
 *
 * Respuestas:
 *   200 { comments: InstagramComment[] }
 *   400 MISSING_MEDIA_ID
 *   401 UNAUTHORIZED | TOKEN_EXPIRED
 *   404 NOT_CONNECTED | MEDIA_NOT_FOUND
 *   429 RATE_LIMITED
 *   502 FETCH_FAILED
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"
import { resolvePrimaryConnection } from "@/lib/instagram/connection"
import { checkRateLimit } from "@/lib/utils/ratelimit"

const GRAPH = "https://graph.instagram.com"
const GRAPH_VERSION = "v23.0"

interface IGComment {
  id: string
  text: string
  username?: string
  timestamp: string
  like_count?: number
  hidden?: boolean
  replies?: { data: Array<{ id: string; text: string; username?: string; timestamp: string; like_count?: number }> }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const igMediaId = req.nextUrl.searchParams.get("mediaId")
  if (!igMediaId) return NextResponse.json({ error: "MISSING_MEDIA_ID" }, { status: 400 })

  const rl = await checkRateLimit("instagram:comments", 20, "60 s")
  if (!rl.success) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 })

  const supabase = await createClient()
  const sb = supabase as any

  const connRes = await resolvePrimaryConnection(supabase)
  if (!connRes.ok) {
    const code = connRes.error.kind === "TOKEN_EXPIRED" ? 401 : 404
    return NextResponse.json({ error: connRes.error.kind }, { status: code })
  }
  const token = connRes.conn.token

  // Resolver la media interna (instagram_comments.media_id es FK uuid)
  const { data: mediaRow } = await sb
    .from("instagram_media")
    .select("id")
    .eq("ig_media_id", igMediaId)
    .maybeSingle()
  if (!mediaRow) return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 })

  // Traer comentarios desde Graph (con replies)
  const url = new URL(`${GRAPH}/${GRAPH_VERSION}/${igMediaId}/comments`)
  url.searchParams.set(
    "fields",
    "id,text,username,timestamp,like_count,hidden,replies{id,text,username,timestamp,like_count}",
  )
  url.searchParams.set("limit", "100")
  url.searchParams.set("access_token", token)

  let igComments: IGComment[] = []
  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12_000) })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      return NextResponse.json({ error: "FETCH_FAILED", detail: json?.error?.message }, { status: 502 })
    }
    igComments = json?.data ?? []
  } catch (e) {
    return NextResponse.json({ error: "FETCH_FAILED", detail: String(e) }, { status: 502 })
  }

  // Upsert top-level + replies
  const now = new Date().toISOString()
  for (const c of igComments) {
    await sb.from("instagram_comments").upsert(
      {
        media_id: mediaRow.id,
        ig_comment_id: c.id,
        username: c.username ?? "",
        text: c.text ?? "",
        timestamp: c.timestamp ? new Date(c.timestamp).toISOString() : now,
        like_count: c.like_count ?? 0,
        is_hidden: c.hidden ?? false,
        parent_id: null,
      },
      { onConflict: "ig_comment_id" },
    )

    for (const r of c.replies?.data ?? []) {
      // resolver el uuid del padre para parent_id (FK interna)
      const { data: parent } = await sb
        .from("instagram_comments")
        .select("id")
        .eq("ig_comment_id", c.id)
        .maybeSingle()
      await sb.from("instagram_comments").upsert(
        {
          media_id: mediaRow.id,
          ig_comment_id: r.id,
          username: r.username ?? "",
          text: r.text ?? "",
          timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : now,
          like_count: r.like_count ?? 0,
          is_hidden: false,
          parent_id: parent?.id ?? null,
        },
        { onConflict: "ig_comment_id" },
      )
    }
  }

  // Devolver lo almacenado para esta media
  const { data: stored } = await sb
    .from("instagram_comments")
    .select("id, media_id, ig_comment_id, ig_user_id, username, text, timestamp, like_count, is_hidden, parent_id")
    .eq("media_id", mediaRow.id)
    .order("timestamp", { ascending: true })

  const comments = ((stored ?? []) as Array<Record<string, unknown>>).map((c) => ({
    id: c.id,
    igCommentId: c.ig_comment_id,
    username: c.username,
    text: c.text,
    timestamp: c.timestamp,
    likeCount: c.like_count,
    hidden: c.is_hidden,
    parentId: c.parent_id,
  }))

  return NextResponse.json({ comments })
}
