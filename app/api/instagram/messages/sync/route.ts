/**
 * POST /api/instagram/messages/sync
 *
 * Sincroniza conversaciones de DM + sus últimos mensajes para la cuenta
 * primaria. Llamado desde la UI (usuario logueado) o por Vercel Cron
 * (Authorization: Bearer <CRON_SECRET>).
 *
 * Respuestas: 200 { synced: number }
 */
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"
import { resolvePrimaryConnection } from "@/lib/instagram/connection"
import { getConversations, getMessages } from "@/lib/instagram/client"

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization")
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isCron) {
    try {
      await requireAuth()
    } catch {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    }
  }

  // Service client para escribir (bypassa RLS), igual que el cron de sync
  const supabase = isCron ? createServiceClient() : await createClient()
  const sb = supabase as any

  const connRes = await resolvePrimaryConnection(supabase)
  if (!connRes.ok) {
    const code = connRes.error.kind === "TOKEN_EXPIRED" ? 401 : 404
    return NextResponse.json({ error: connRes.error.kind }, { status: code })
  }
  const { token, igUserId, accountDbId } = connRes.conn

  const convs = await getConversations(igUserId, token)
  let synced = 0

  for (const conv of convs) {
    const participants = conv.participants?.data ?? []
    const other = participants.find((p) => p.id !== igUserId) ?? participants[0]
    const lastMessageAt = conv.updated_time ? new Date(conv.updated_time).toISOString() : null

    // Upsert conversación
    const { data: convRow } = await sb
      .from("instagram_conversations")
      .upsert(
        {
          account_id: accountDbId,
          ig_conversation_id: conv.id,
          participant_ig_id: other?.id ?? "",
          participant_username: other?.username ?? other?.name ?? "",
          participant_name: other?.name ?? "",
          last_message_at: lastMessageAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "ig_conversation_id" },
      )
      .select("id")
      .maybeSingle()

    if (!convRow) continue

    const msgs = await getMessages(conv.id, token, 20)
    let lastUserMsgAt: string | null = null

    for (const msg of msgs) {
      const isFromBusiness = msg.from?.id === igUserId
      const ts = msg.created_time ? new Date(msg.created_time).toISOString() : new Date().toISOString()

      await sb.from("instagram_messages").upsert(
        {
          conversation_id: convRow.id,
          ig_message_id: msg.id,
          direction: isFromBusiness ? "outbound" : "inbound",
          message_type: "text",
          content: msg.message ?? "",
          sent_by_me: isFromBusiness,
          received_at: ts,
        },
        { onConflict: "ig_message_id" },
      )

      if (!isFromBusiness && (!lastUserMsgAt || ts > lastUserMsgAt)) lastUserMsgAt = ts
    }

    if (lastUserMsgAt) {
      await sb
        .from("instagram_conversations")
        .update({ last_user_message_at: lastUserMsgAt })
        .eq("id", convRow.id)
    }

    synced++
  }

  return NextResponse.json({ synced })
}
