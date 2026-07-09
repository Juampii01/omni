// Resumen nocturno de conversaciones sin responder — a diferencia de los
// otros análisis, esto no llama a Claude: es un query directo sobre quién
// habló último en cada conversación. Instagram por ahora; Slack se suma acá
// mismo (mismo shape UnansweredItem con platform:"slack") cuando esa
// integración exista — no hace falta rediseñar nada, solo agregar el query.

import { createServiceClient } from "@/lib/supabase-service"

export interface UnansweredItem {
  platform: "instagram" | "slack"
  participante: string
  ultimo_mensaje: string
  hace: string
}

export interface UnansweredDigestResult {
  findings: UnansweredItem[]
  conversationsChecked: number
}

function timeAgo(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (hours < 1) return "hace menos de 1 hora"
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

export async function buildUnansweredDigest(clientId: string): Promise<UnansweredDigestResult> {
  if (!clientId) throw new Error("client_id es obligatorio")

  const supabase = createServiceClient()

  const { data: conversations, error } = await supabase
    .from("instagram_conversations")
    .select("id, client_id, participant_username, last_message_at, last_message_sender, last_message_preview")
    .eq("client_id", clientId)
    .order("last_message_at", { ascending: true })

  if (error) throw new Error(error.message)

  // Defensa en profundidad — ya filtramos por client_id arriba.
  for (const conv of conversations ?? []) {
    if (conv.client_id !== clientId) {
      throw new Error(`Aislamiento violado: conversación ${conv.id} pertenece a client_id=${conv.client_id}, se esperaba ${clientId}`)
    }
  }

  const unanswered = (conversations ?? []).filter((c) => c.last_message_sender === "lead" && c.last_message_at)

  const findings: UnansweredItem[] = unanswered.map((c) => ({
    platform: "instagram",
    participante: c.participant_username ?? "(desconocido)",
    ultimo_mensaje: c.last_message_preview ?? "",
    hace: timeAgo(c.last_message_at!),
  }))

  return { findings, conversationsChecked: conversations?.length ?? 0 }
}
