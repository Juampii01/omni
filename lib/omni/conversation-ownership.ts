// Helpers de la máquina de estados de owner (ig_conversation_state) — quién
// controla el envío de la conversación en cada momento. La regla dura de
// "la IA solo manda si owner sigue siendo ia_activa AL MOMENTO del envío"
// vive acá como un UPDATE condicional atómico, no como un SELECT-y-después-
// mando (eso tiene ventana de carrera; esto no).

import { createServiceClient } from "@/lib/supabase-service"

/**
 * Intenta reclamar el envío: solo tiene éxito si owner sigue siendo
 * 'ia_activa' en este preciso momento. Si algo cambió el owner entre que
 * se generó la respuesta de la IA y ahora (botón de tomar control, límite
 * duro violado, "no cerró", echo de envío manual detectado), esto devuelve
 * false y el caller tiene que descartar la respuesta generada, no mandarla.
 */
export async function tryClaimAiSend(stateId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc("try_claim_ai_send", { p_state_id: stateId })

  if (error) throw new Error(`No se pudo revalidar owner antes de enviar: ${error.message}`)
  return data === true
}

export type EscalationReason =
  | "limite_duro"
  | "no_cerro"
  | "envio_manual_detectado"
  | "boton_tomar_control"

/** owner_changed_by queda null para las 3 razones de sistema — solo el
 *  botón de tomar control (llamado desde la ruta de API con ctx.userId)
 *  pasa un actorId real. */
export async function escalateToHuman(stateId: string, reason: EscalationReason, actorId?: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("ig_conversation_state")
    .update({
      owner: "escalado_humano",
      owner_changed_at: new Date().toISOString(),
      owner_changed_by: actorId ?? null,
    })
    .eq("id", stateId)
    // Defensivo: no pisa un estado ya cerrado — un ciclo terminado no
    // vuelve a escalado_humano por un evento tardío.
    .neq("owner", "cerrado")

  if (error) throw new Error(`No se pudo escalar a humano (${reason}): ${error.message}`)
}

/** Cierre real y terminal — solo para cuando hubo señal de cierre exitosa
 *  (owner pasa a 'cerrado': un mensaje nuevo del lead más adelante arranca
 *  un ciclo nuevo, no reabre este). NO usar para el caso "no cerró" — ahí
 *  la conversación se escala a un humano, no se cierra (ver markNoCerro). */
export async function closeConversation(stateId: string, etapa: "cerrado_pendiente_cobro"): Promise<boolean> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("ig_conversation_state")
    .update({ owner: "cerrado", etapa, closed_at: new Date().toISOString() })
    .eq("id", stateId)
    .eq("owner", "ia_activa")
    .select("id")

  if (error) throw new Error(`No se pudo cerrar la conversación: ${error.message}`)
  return (data?.length ?? 0) > 0
}

/** "No cerró" no es un cierre terminal — la conversación se escala a un
 *  humano (owner='escalado_humano'), que puede retomarla más adelante. Solo
 *  cambia etapa acá; el owner lo pone escalateToHuman en el mismo call site. */
export async function markNoCerro(stateId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("ig_conversation_state")
    .update({ etapa: "no_cerro" })
    .eq("id", stateId)
    .eq("owner", "ia_activa")
    .select("id")
  if (error) throw new Error(`No se pudo marcar no_cerro: ${error.message}`)
  return (data?.length ?? 0) > 0
}

/**
 * Dedupe antes de prospección fría — excluye leads que ya tienen una
 * conversación en curso (IA respondiendo o escalada a humano) de cualquier
 * lista de "a quién contactar en frío".
 *
 * Sin call site todavía: hoy no existe ninguna función que sugiera a quién
 * prospectar en frío en el Omni actual — queda lista para cuando se
 * construya esa pieza, no la engancho a nada que no exista.
 */
export async function isLeadInActiveConversation(clientId: string, instagramUserId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("ig_conversation_state")
    .select("id")
    .eq("client_id", clientId)
    .eq("instagram_user_id", instagramUserId)
    .in("owner", ["ia_activa", "escalado_humano"])
    .limit(1)

  if (error) throw new Error(`No se pudo chequear conversación activa: ${error.message}`)
  return (data?.length ?? 0) > 0
}

/**
 * Mapea el recipient.id de un webhook entrante a un client_id, vía
 * client_config.ig_account_id.
 *
 * ADVERTENCIA sin verificar: fetchIgConversations (instagram-oauth.ts) deja
 * documentado que Meta usa esquemas de ID distintos para la misma cuenta
 * según el endpoint (el /me del OAuth no coincide con el id que usa el
 * endpoint de mensajería). No hay forma de confirmar si el id que trae el
 * webhook en tiempo real coincide con ig_account_id (capturado desde /me)
 * sin un webhook real registrado — no se puede probar en este entorno.
 * Por eso esta función no falla en silencio: si no encuentra match, lo
 * devuelve explícito para que el caller loguee el recipient.id crudo y se
 * pueda diagnosticar con el primer evento real, en vez de perder el
 * mensaje sin rastro.
 */
export async function resolveClientFromIgAccountId(igAccountId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("client_config")
    .select("client_id")
    .eq("ig_account_id", igAccountId)
    .maybeSingle()

  if (error) throw new Error(`No se pudo resolver client_id desde ig_account_id: ${error.message}`)
  return data?.client_id ?? null
}
