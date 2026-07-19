// Send API de Instagram — no existía ninguna función de envío en el
// proyecto (instagram-oauth.ts es todo lectura: fetchIgConversations/
// fetchIgMessages para el sync manual). Se construye acá de cero para el
// motor de cierre.

import { createServiceClient } from "@/lib/supabase-service"

/** Manda un mensaje de texto por Instagram Direct. Devuelve el message_id
 *  que asigna Meta — hay que registrarlo en ig_own_sent_messages
 *  inmediatamente después, para que la detección de envíos manuales
 *  (comparar contra este registro) funcione. */
export async function sendIgMessage(accessToken: string, recipientIgId: string, text: string): Promise<{ id: string }> {
  const res = await fetch(`https://graph.instagram.com/v23.0/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientIgId }, message: { text } }),
    signal: AbortSignal.timeout(15_000),
  })
  const bodyText = await res.text()
  if (!res.ok) throw new Error(`IG send ${res.status}: ${bodyText.slice(0, 200)}`)

  const data = JSON.parse(bodyText) as { message_id?: string }
  if (!data.message_id) throw new Error(`IG send: respuesta sin message_id — ${bodyText.slice(0, 200)}`)
  return { id: data.message_id }
}

/** Registra un envío propio para que el handler de webhooks pueda
 *  distinguir "esto lo mandó Omni" de "esto lo mandó un humano a mano" al
 *  recibir el echo correspondiente. */
export async function recordOwnSentMessage(igMessageId: string, clientId: string, conversationId: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from("ig_own_sent_messages").insert({
    ig_message_id: igMessageId,
    client_id: clientId,
    conversation_id: conversationId,
  })
  // No revienta el flujo de envío por esto — el mensaje YA salió por
  // Instagram, no tiene sentido tratarlo como error del envío. Si el
  // insert falla, en el peor caso el echo de este mensaje se va a
  // interpretar como manual (falso positivo de escalado), no se pierde el
  // mensaje ni se manda dos veces.
  if (error) console.error(`No se pudo registrar mensaje propio ${igMessageId}: ${error.message}`)
}

export async function wasSentByOmni(igMessageId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("ig_own_sent_messages")
    .select("ig_message_id")
    .eq("ig_message_id", igMessageId)
    .maybeSingle()

  if (error) throw new Error(`No se pudo chequear origen del mensaje: ${error.message}`)
  return !!data
}
