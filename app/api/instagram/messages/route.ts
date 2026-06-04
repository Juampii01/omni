/**
 * GET /api/instagram/messages
 *   sin params         → lista de conversaciones (más recientes primero)
 *   ?conversationId=ID → conversación (por ig_conversation_id) + sus mensajes
 *
 * Solo lectura desde DB. Usar POST /api/instagram/messages/sync para refrescar.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"

function mapConversation(c: Record<string, any>) {
  return {
    id: c.id,
    conversationId: c.ig_conversation_id,
    participantId: c.participant_ig_id ?? "",
    participantUsername: c.participant_username ?? c.participant_name ?? "",
    participantPic: c.participant_avatar_url ?? "",
    lastMessageAt: c.last_message_at ?? null,
    lastUserMessageAt: c.last_user_message_at ?? null,
    unreadCount: c.unread_count ?? 0,
  }
}

function mapMessage(m: Record<string, any>) {
  return {
    id: m.id,
    messageId: m.ig_message_id,
    fromUsername: m.sent_by_me ? "" : "",
    text: m.content ?? "",
    isFromBusiness: m.sent_by_me ?? m.direction === "outbound",
    timestamp: m.received_at,
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const supabase = await createClient()
  const sb = supabase as any

  const { data: acct } = await sb
    .from("instagram_accounts")
    .select("id")
    .eq("is_primary", true)
    .maybeSingle()
  if (!acct) return NextResponse.json({ conversations: [] })

  const conversationId = req.nextUrl.searchParams.get("conversationId")

  if (conversationId) {
    const { data: conv } = await sb
      .from("instagram_conversations")
      .select("*")
      .eq("account_id", acct.id)
      .eq("ig_conversation_id", conversationId)
      .maybeSingle()
    if (!conv) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

    const { data: msgs } = await sb
      .from("instagram_messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("received_at", { ascending: true })

    return NextResponse.json({
      conversation: mapConversation(conv),
      messages: ((msgs ?? []) as Array<Record<string, any>>).map(mapMessage),
    })
  }

  const { data: convs } = await sb
    .from("instagram_conversations")
    .select("*")
    .eq("account_id", acct.id)
    .order("last_message_at", { ascending: false })
    .limit(30)

  return NextResponse.json({
    conversations: ((convs ?? []) as Array<Record<string, any>>).map(mapConversation),
  })
}
