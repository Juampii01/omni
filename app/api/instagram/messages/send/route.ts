/**
 * POST /api/instagram/messages/send
 * Body: { conversationId: string (ig_conversation_id), text: string }
 *
 * Valida la ventana de 24h, envía el DM vía Graph API y lo persiste.
 *
 * Respuestas:
 *   200 { message }
 *   400 MISSING_FIELDS · 401 UNAUTHORIZED|TOKEN_EXPIRED · 403 MESSAGING_WINDOW_CLOSED
 *   404 NOT_CONNECTED|CONVERSATION_NOT_FOUND · 429 RATE_LIMITED · 502 FETCH_FAILED
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"
import { resolvePrimaryConnection } from "@/lib/instagram/connection"
import { sendMessage } from "@/lib/instagram/client"
import { checkRateLimit } from "@/lib/utils/ratelimit"

const WINDOW_MS = 24 * 60 * 60 * 1000

const BodySchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1).max(1000),
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
  const { conversationId, text } = parsed.data

  const rl = await checkRateLimit("instagram:messages:send", 30, "60 s")
  if (!rl.success) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 })

  const supabase = await createClient()
  const sb = supabase as any

  const connRes = await resolvePrimaryConnection(supabase)
  if (!connRes.ok) {
    const code = connRes.error.kind === "TOKEN_EXPIRED" ? 401 : 404
    return NextResponse.json({ error: connRes.error.kind }, { status: code })
  }
  const { token, igUserId, accountDbId, username } = connRes.conn

  const { data: conv } = await sb
    .from("instagram_conversations")
    .select("id, participant_ig_id, last_user_message_at")
    .eq("account_id", accountDbId)
    .eq("ig_conversation_id", conversationId)
    .maybeSingle()
  if (!conv) return NextResponse.json({ error: "CONVERSATION_NOT_FOUND" }, { status: 404 })

  // Ventana de 24h
  if (!conv.last_user_message_at) {
    return NextResponse.json(
      { error: "MESSAGING_WINDOW_CLOSED", detail: "No hay mensajes del usuario en esta conversación" },
      { status: 403 },
    )
  }
  const windowAge = Date.now() - new Date(conv.last_user_message_at).getTime()
  if (windowAge > WINDOW_MS) {
    return NextResponse.json(
      { error: "MESSAGING_WINDOW_CLOSED", detail: "Pasaron más de 24h desde el último mensaje del usuario" },
      { status: 403 },
    )
  }

  let newMsgId: string
  try {
    newMsgId = await sendMessage(igUserId, token, conv.participant_ig_id, text)
  } catch (e) {
    return NextResponse.json({ error: "FETCH_FAILED", detail: String(e) }, { status: 502 })
  }

  const now = new Date().toISOString()
  await sb.from("instagram_messages").upsert(
    {
      conversation_id: conv.id,
      ig_message_id: newMsgId || `local-${Date.now()}`,
      direction: "outbound",
      message_type: "text",
      content: text,
      sent_by_me: true,
      received_at: now,
    },
    { onConflict: "ig_message_id" },
  )

  await sb
    .from("instagram_conversations")
    .update({ last_message_at: now, last_message_preview: text.slice(0, 120), updated_at: now })
    .eq("id", conv.id)

  return NextResponse.json({
    message: { id: newMsgId, messageId: newMsgId, text, isFromBusiness: true, fromUsername: username ?? "", timestamp: now },
  })
}
