import { NextRequest, NextResponse } from "next/server"
import { requireInternal, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { isOwnClient } from "@/lib/omni/isolation"

const MESSAGES_LIMIT = 200

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const supabase = createServiceClient()

  const { data: conversation, error: convError } = await supabase
    .from("instagram_conversations")
    .select("id, client_id, participant_username, participant_ig_id, last_message_at")
    .eq("id", id)
    .maybeSingle()

  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 })
  if (!conversation || !isOwnClient([conversation], ctx.clientId)) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 })
  }

  // Los últimos MESSAGES_LIMIT en orden cronológico: pedirlos ASC+limit
  // traería los más VIEJOS en una conversación larga, no los más recientes
  // — por eso DESC+limit y recién ahí se invierte para mostrar.
  const { data: messages, error: messagesError } = await supabase
    .from("instagram_messages")
    .select("id, sender, body, sent_at")
    .eq("conversation_id", id)
    .order("sent_at", { ascending: false })
    .limit(MESSAGES_LIMIT)

  if (messagesError) return NextResponse.json({ error: messagesError.message }, { status: 500 })

  return NextResponse.json({ conversation, messages: (messages ?? []).reverse() })
}
