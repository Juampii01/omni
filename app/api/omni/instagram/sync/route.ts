import { NextRequest, NextResponse } from "next/server"
import { requireInternal, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { decryptToken } from "@/lib/crypto"
import { fetchIgConversations, fetchIgMessages, type IgMessage } from "@/lib/omni/instagram-oauth"

export async function POST(req: NextRequest) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data: config, error: configError } = await supabase
    .from("client_config")
    .select("ig_access_token, ig_account_username, ig_account_id")
    .eq("client_id", ctx.clientId)
    .maybeSingle()

  if (configError) return NextResponse.json({ error: configError.message }, { status: 500 })
  if (!config?.ig_access_token || !config.ig_account_username || !config.ig_account_id) {
    return NextResponse.json({ error: "Instagram no está conectado" }, { status: 400 })
  }

  const accessToken = decryptToken(config.ig_access_token)

  let conversations
  try {
    conversations = await fetchIgConversations(accessToken, config.ig_account_username)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error consultando Instagram" }, { status: 502 })
  }

  // Pasada 1: solo llamadas externas a la Graph API (no batcheable, se queda
  // por-conversación) — acumula todo en memoria antes de tocar Supabase.
  const perConversation: Array<{
    igConversationId: string
    participantUsername: string | null
    participantIgId: string
    messages: IgMessage[]
  }> = []

  for (const conv of conversations) {
    if (!conv.participantIgId) {
      console.error(`[omni/instagram/sync] Conversación sin participantIgId identificado — no se puede armar ig_conversation_id de forma consistente con el webhook, se saltea. ig_conversation_id_meta=${conv.id}`)
      continue
    }
    let messages: IgMessage[]
    try {
      messages = await fetchIgMessages(accessToken, conv.id, conv.selfIgId)
    } catch {
      messages = []
    }
    // Mismo formato sintético que ya usa el webhook (participantId_accountId)
    // — así ambos caminos matchean la misma fila en vez de crear duplicados.
    perConversation.push({
      igConversationId: `${conv.participantIgId}_${config.ig_account_id}`,
      participantUsername: conv.participantUsername,
      participantIgId: conv.participantIgId,
      messages,
    })
  }

  if (perConversation.length === 0) return NextResponse.json({ conversationsSynced: 0, messagesSynced: 0 })

  // Pasada 2: un solo upsert masivo de conversaciones — incluye ya
  // last_message_at/sender/preview calculados de los mensajes de la pasada 1,
  // para no necesitar un update aparte por fila más adelante.
  const conversationRows = perConversation.map((pc) => {
    const lastMessage = pc.messages.reduce<IgMessage | null>(
      (latest, m) => (m.sentAt && (!latest || (latest.sentAt ?? "") < m.sentAt) ? m : latest),
      null
    )
    return {
      client_id: ctx.clientId,
      ig_conversation_id: pc.igConversationId,
      participant_username: pc.participantUsername,
      participant_ig_id: pc.participantIgId,
      synced_at: new Date().toISOString(),
      ...(lastMessage
        ? {
            last_message_at: lastMessage.sentAt,
            last_message_sender: lastMessage.from,
            last_message_preview: lastMessage.body?.slice(0, 200) ?? null,
          }
        : {}),
    }
  })

  const { data: convRows, error: convError } = await supabase
    .from("instagram_conversations")
    .upsert(conversationRows, { onConflict: "client_id,ig_conversation_id" })
    .select("id, ig_conversation_id")

  if (convError || !convRows) {
    return NextResponse.json({ error: convError?.message ?? "No se pudieron sincronizar las conversaciones" }, { status: 500 })
  }

  const idByIgConversationId = new Map(convRows.map((r) => [r.ig_conversation_id, r.id]))

  // Pasada 3: un solo upsert masivo de mensajes de todas las conversaciones.
  const allMessages = perConversation.flatMap((pc) => {
    const conversationId = idByIgConversationId.get(pc.igConversationId)
    if (!conversationId) return []
    return pc.messages.map((m) => ({
      conversation_id: conversationId,
      ig_message_id: m.id,
      sender: m.from,
      body: m.body,
      sent_at: m.sentAt,
      synced_at: new Date().toISOString(),
    }))
  })

  let messagesSynced = 0
  if (allMessages.length > 0) {
    const { error: msgError } = await supabase.from("instagram_messages").upsert(allMessages, { onConflict: "conversation_id,ig_message_id" })
    if (!msgError) messagesSynced = allMessages.length
  }

  return NextResponse.json({ conversationsSynced: convRows.length, messagesSynced })
}
