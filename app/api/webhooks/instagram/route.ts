// Webhook real de Instagram (mensajes entrantes en tiempo real) — no existía
// nada de esto antes en el proyecto, se construye 100% de cero. Dos cosas
// quedan marcadas explícitamente como "no verificable sin un webhook real
// registrado" — ver comentarios puntuales abajo. No conectar contra una
// cuenta real hasta que la Fase 3 esté aprobada.

import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { after } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"
import { resolveClientFromIgAccountId, escalateToHuman } from "@/lib/omni/conversation-ownership"
import { wasSentByOmni } from "@/lib/omni/instagram-send"
import { processIncomingLeadMessage } from "@/lib/omni/closing-engine"

// Handshake de verificación — Meta lo llama una vez al registrar el
// webhook. META_WEBHOOK_VERIFY_TOKEN ya estaba en .env.local desde antes,
// sin usar en ningún lado del código — este es el primer uso real.
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode")
  const token = req.nextUrl.searchParams.get("hub.verify_token")
  const challenge = req.nextUrl.searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

/**
 * NO VERIFICADO — usa META_APP_SECRET (no INSTAGRAM_APP_SECRET, que ya
 * gobierna el OAuth login) porque el naming (META_APP_ID/META_APP_SECRET/
 * META_WEBHOOK_VERIFY_TOKEN, todos con el mismo prefijo) sugiere que son
 * las credenciales del lado "app/webhook" separadas de las del lado
 * "Instagram Login OAuth". No hay forma de confirmar esto sin un webhook
 * real registrado contra el dashboard de Meta — si la firma nunca valida
 * con eventos reales, este es el primer lugar a revisar.
 */
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.META_APP_SECRET
  if (!secret || !signatureHeader) return false

  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex")
  const expectedBuf = Buffer.from(expected)
  const receivedBuf = Buffer.from(signatureHeader)
  if (expectedBuf.length !== receivedBuf.length) return false
  return timingSafeEqual(expectedBuf, receivedBuf)
}

interface MessagingEntry {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: number
  message?: { mid?: string; id?: string; text?: string; is_echo?: boolean; is_self?: boolean }
}

interface WebhookPayload {
  object?: string
  entry?: Array<{ id?: string; messaging?: MessagingEntry[] }>
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  if (!verifySignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    console.error("[webhooks/instagram] Firma inválida o ausente — evento rechazado")
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (payload.object !== "instagram") {
    return NextResponse.json({ ok: true }) // no es para nosotros, 200 igual para que Meta no reintente
  }

  // Responder rápido es importante para Meta — el procesamiento real
  // (incluida la llamada a Claude) corre después de mandar la respuesta,
  // vía after() de Next.js (no un fire-and-forget sin esperar, que en
  // serverless puede cortarse apenas se manda la respuesta).
  after(async () => {
    for (const entry of payload.entry ?? []) {
      for (const messaging of entry.messaging ?? []) {
        try {
          await handleMessagingEvent(messaging)
        } catch (e) {
          console.error(`[webhooks/instagram] Error procesando evento: ${e instanceof Error ? e.message : e}`)
        }
      }
    }
  })

  return NextResponse.json({ ok: true })
}

async function handleMessagingEvent(messaging: MessagingEntry): Promise<void> {
  const recipientId = messaging.recipient?.id
  const senderId = messaging.sender?.id
  if (!recipientId || !senderId || !messaging.message) return

  const isEcho = messaging.message.is_echo === true || messaging.message.is_self === true
  const igMessageId = messaging.message.mid ?? messaging.message.id

  // Meta invierte sender/recipient según la dirección: en un entrante
  // genuino, recipient = cuenta de negocio; en un echo (salió de la
  // cuenta, nuestro o manual), sender = cuenta de negocio. Hay que saber
  // isEcho ANTES de resolver client_id — si no, un echo se busca con el
  // id del lead, nunca matchea ig_account_id, y se descarta antes de
  // llegar a la detección de eco.
  //
  // NO VERIFICADO — ver conversation-ownership.ts:resolveClientFromIgAccountId.
  // Si esto no encuentra match con eventos reales, loguear el id crudo
  // (ya lo hace la función) es el punto de partida para diagnosticar.
  const businessAccountId = isEcho ? senderId : recipientId
  const clientId = await resolveClientFromIgAccountId(businessAccountId)
  if (!clientId) {
    console.error(`[webhooks/instagram] Sin client_id para business_account_id=${businessAccountId} (isEcho=${isEcho}) — evento descartado, no hay dónde guardarlo`)
    return
  }

  const supabase = createServiceClient()

  if (isEcho) {
    if (!igMessageId) return
    const sentByOmni = await wasSentByOmni(igMessageId)
    if (sentByOmni) return // eco de nuestro propio envío, nada que hacer

    // Echo que NO originamos nosotros — envío manual fuera del sistema.
    // Escalamos la conversación de este lead (senderId acá es el lead
    // visto desde un mensaje saliente: recipient es el lead, no el
    // negocio — Meta invierte sender/recipient según la dirección).
    const leadId = messaging.recipient?.id
    if (!leadId) return
    const { data: conv } = await supabase
      .from("instagram_conversations")
      .select("id")
      .eq("client_id", clientId)
      .eq("participant_ig_id", leadId)
      .maybeSingle()
    if (!conv) return
    const { data: state } = await supabase
      .from("ig_conversation_state")
      .select("id")
      .eq("conversation_id", conv.id)
      .neq("owner", "cerrado")
      .maybeSingle()
    if (state) await escalateToHuman(state.id, "envio_manual_detectado")
    return
  }

  // Mensaje entrante genuino del lead — find-or-create de la conversación,
  // mismo shape que ya usa el sync manual, para que ambos caminos (webhook
  // en tiempo real, sync manual de respaldo) escriban en las mismas tablas
  // sin duplicar almacenamiento.
  const { data: conv, error: convError } = await supabase
    .from("instagram_conversations")
    .upsert(
      { client_id: clientId, ig_conversation_id: `${senderId}_${recipientId}`, participant_ig_id: senderId, synced_at: new Date().toISOString() },
      { onConflict: "client_id,ig_conversation_id" }
    )
    .select("id")
    .single()

  if (convError || !conv) {
    console.error(`[webhooks/instagram] No se pudo upsert conversación: ${convError?.message}`)
    return
  }

  if (igMessageId) {
    await supabase.from("instagram_messages").upsert(
      {
        conversation_id: conv.id,
        ig_message_id: igMessageId,
        sender: "lead",
        body: messaging.message.text ?? null,
        sent_at: messaging.timestamp ? new Date(messaging.timestamp).toISOString() : new Date().toISOString(),
      },
      { onConflict: "conversation_id,ig_message_id" }
    )
  }

  await supabase
    .from("instagram_conversations")
    .update({ last_message_at: new Date().toISOString(), last_message_sender: "lead", last_message_preview: messaging.message.text?.slice(0, 200) ?? null })
    .eq("id", conv.id)

  // find-or-create del ciclo de estado activo. Si no hay ninguno abierto
  // (primera vez que este lead escribe, o el ciclo anterior ya cerró), se
  // crea uno nuevo en ia_activa directamente — es el trigger de "se abre
  // la ventana de 24hs".
  const { data: existingState } = await supabase
    .from("ig_conversation_state")
    .select("id, client_id, conversation_id, instagram_user_id, owner")
    .eq("conversation_id", conv.id)
    .neq("owner", "cerrado")
    .maybeSingle()

  let state = existingState
  if (!state) {
    const { data: created, error: createError } = await supabase
      .from("ig_conversation_state")
      .insert({ client_id: clientId, conversation_id: conv.id, instagram_user_id: senderId, owner: "ia_activa" })
      .select("id, client_id, conversation_id, instagram_user_id, owner")
      .single()
    if (createError || !created) {
      console.error(`[webhooks/instagram] No se pudo crear ig_conversation_state: ${createError?.message}`)
      return
    }
    state = created
  }

  await supabase.from("ig_conversation_state").update({ last_lead_message_at: new Date().toISOString() }).eq("id", state.id)

  if (state.owner !== "ia_activa") return // escalado_humano o sin_reclamar sin reclamar todavía — la IA no responde

  await processIncomingLeadMessage(state)
}
