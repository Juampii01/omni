import { NextRequest, NextResponse } from "next/server"
import { requireInternal } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { decryptToken } from "@/lib/crypto"
import { fetchIgConversations, fetchIgMessages } from "@/lib/omni/instagram-oauth"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

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

  let conversationsSynced = 0
  let messagesSynced = 0

  for (const conv of conversations) {
    if (!conv.participantIgId) {
      console.error(`[omni/instagram/sync] Conversación sin participantIgId identificado — no se puede armar ig_conversation_id de forma consistente con el webhook, se saltea. ig_conversation_id_meta=${conv.id}`)
      continue
    }
    // Mismo formato sintético que ya usa el webhook (senderId_recipientId,
    // lead primero, negocio segundo) — así ambos caminos matchean la misma
    // fila en vez de crear duplicados. conv.id (el id real de Meta) sigue
    // haciendo falta más abajo para fetchIgMessages, que sí le pega a la
    // Graph API con el id real — no se toca esa parte.
    const igConversationId = `${conv.participantIgId}_${config.ig_account_id}`
    const { data: convRow, error: convError } = await supabase
      .from("instagram_conversations")
      .upsert(
        {
          client_id: ctx.clientId,
          ig_conversation_id: igConversationId,
          participant_username: conv.participantUsername,
          participant_ig_id: conv.participantIgId,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "client_id,ig_conversation_id" }
      )
      .select("id")
      .single()

    if (convError || !convRow) continue
    conversationsSynced++

    let messages
    try {
      messages = await fetchIgMessages(accessToken, conv.id, conv.selfIgId)
    } catch {
      continue
    }
    if (messages.length === 0) continue

    const { error: msgError } = await supabase.from("instagram_messages").upsert(
      messages.map((m) => ({
        conversation_id: convRow.id,
        ig_message_id: m.id,
        sender: m.from,
        body: m.body,
        sent_at: m.sentAt,
        synced_at: new Date().toISOString(),
      })),
      { onConflict: "conversation_id,ig_message_id" }
    )
    if (!msgError) messagesSynced += messages.length

    const lastMessage = messages.reduce<(typeof messages)[number] | null>(
      (latest, m) => (m.sentAt && (!latest || (latest.sentAt ?? "") < m.sentAt) ? m : latest),
      null
    )
    if (lastMessage) {
      await supabase
        .from("instagram_conversations")
        .update({
          last_message_at: lastMessage.sentAt,
          last_message_sender: lastMessage.from,
          last_message_preview: lastMessage.body?.slice(0, 200) ?? null,
        })
        .eq("id", convRow.id)
    }
  }

  return NextResponse.json({ conversationsSynced, messagesSynced })
}
