import { NextRequest, NextResponse } from "next/server"
import { requireInternal, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

// 3 round-trips fijos (no escalan con la cantidad de conversaciones, misma
// filosofía que la Fase G): conversaciones, estado abierto por conversación,
// y el último mensaje de cada una para el preview — reusa la función de
// Postgres de get_recent_messages_per_conversation (Fase G4) con límite 1.
export async function GET(req: NextRequest) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()

  const { data: conversations, error } = await supabase
    .from("instagram_conversations")
    .select("id, participant_username, participant_ig_id, last_message_at")
    .eq("client_id", ctx.clientId)
    .order("last_message_at", { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!conversations || conversations.length === 0) return NextResponse.json({ conversations: [] })

  const ids = conversations.map((c) => c.id)

  const [stateRes, previewRes] = await Promise.all([
    supabase
      .from("ig_conversation_state")
      .select("id, conversation_id, owner, etapa")
      .eq("client_id", ctx.clientId)
      .in("conversation_id", ids)
      .neq("owner", "cerrado"),
    supabase.rpc("get_recent_messages_per_conversation", { p_conversation_ids: ids, p_limit_per_conversation: 1 }),
  ])

  if (stateRes.error) return NextResponse.json({ error: stateRes.error.message }, { status: 500 })
  if (previewRes.error) return NextResponse.json({ error: previewRes.error.message }, { status: 500 })

  const stateByConversation = new Map((stateRes.data ?? []).map((s) => [s.conversation_id, s]))
  const previewByConversation = new Map((previewRes.data ?? []).map((p: any) => [p.conversation_id, p]))

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      ...c,
      state: stateByConversation.get(c.id) ?? null,
      preview: previewByConversation.get(c.id) ?? null,
    })),
  })
}
