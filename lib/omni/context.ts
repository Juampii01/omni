import { createServiceClient } from "@/lib/supabase-service"

/**
 * Armado del contexto que se le pasa al motor de IA. `client_id` es un
 * parámetro obligatorio de la firma — nunca se infiere de una sesión, variable
 * global o default. Cada fuente de datos se trae ya filtrada por client_id, y
 * al final se corre una verificación explícita que revienta fuerte (no un
 * warning) si aparece una fila de otro cliente. El aislamiento es la garantía
 * central del producto: mejor un 500 que una filtración de datos.
 */

export class ClientIsolationError extends Error {
  constructor(source: string, expectedClientId: string, foundClientId: string) {
    super(
      `Aislamiento violado en "${source}": se esperaba client_id=${expectedClientId} pero se encontró client_id=${foundClientId}`
    )
    this.name = "ClientIsolationError"
  }
}

type MentorKnowledgeRow = {
  client_id: string
  layer: "framework" | "vocabulario" | "casos"
  title: string
  content: string
}

type LeadRow = {
  client_id: string
  name: string | null
  instagram: string | null
  source: string | null
  status: string
  rating: number | null
  niche: string | null
  notes: string | null
}

type SlackChannelRow = { id: string; client_id: string; name: string }
type SlackMessageRow = { channel_id: string; user_name: string | null; body: string | null; posted_at: string | null }

type InstagramConversationRow = { id: string; client_id: string; participant_username: string | null }
type InstagramMessageRow = { conversation_id: string; sender: string; body: string | null; sent_at: string | null }

export type ClientContext = {
  clientId: string
  mentorKnowledge: MentorKnowledgeRow[]
  leads: LeadRow[]
  slackMessages: Array<SlackMessageRow & { channelName: string }>
  instagramMessages: Array<InstagramMessageRow & { participantUsername: string | null }>
}

/** Revienta fuerte si alguna fila trae un client_id que no es el esperado. */
function assertRowsBelongToClient<T extends { client_id: string }>(
  source: string,
  clientId: string,
  rows: T[]
): void {
  for (const row of rows) {
    if (row.client_id !== clientId) {
      throw new ClientIsolationError(source, clientId, row.client_id)
    }
  }
}

export async function buildClientContext(clientId: string): Promise<ClientContext> {
  if (!clientId) {
    throw new Error("buildClientContext requiere client_id — no hay default ni inferencia de sesión.")
  }

  const supabase = createServiceClient()

  const [mentorRes, leadsRes, channelsRes, conversationsRes] = await Promise.all([
    supabase
      .from("client_mentor_knowledge")
      .select("client_id, layer, title, content")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("layer", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("leads")
      .select("client_id, name, instagram, source, status, rating, niche, notes")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("slack_channels")
      .select("id, client_id, name")
      .eq("client_id", clientId),
    supabase
      .from("instagram_conversations")
      .select("id, client_id, participant_username")
      .eq("client_id", clientId),
  ])

  if (mentorRes.error) throw mentorRes.error
  if (leadsRes.error) throw leadsRes.error
  if (channelsRes.error) throw channelsRes.error
  if (conversationsRes.error) throw conversationsRes.error

  const mentorKnowledge = (mentorRes.data ?? []) as MentorKnowledgeRow[]
  const leads = (leadsRes.data ?? []) as LeadRow[]
  const channels = (channelsRes.data ?? []) as SlackChannelRow[]
  const conversations = (conversationsRes.data ?? []) as InstagramConversationRow[]

  // Verificación explícita — antes de usar estas filas para las queries hijas,
  // confirmamos que efectivamente pertenecen al cliente pedido.
  assertRowsBelongToClient("client_mentor_knowledge", clientId, mentorKnowledge)
  assertRowsBelongToClient("leads", clientId, leads)
  assertRowsBelongToClient("slack_channels", clientId, channels)
  assertRowsBelongToClient("instagram_conversations", clientId, conversations)

  const channelIds = channels.map((c) => c.id)
  const conversationIds = conversations.map((c) => c.id)

  const [slackMessagesRes, instagramMessagesRes] = await Promise.all([
    channelIds.length > 0
      ? supabase
          .from("slack_messages")
          .select("channel_id, user_name, body, posted_at")
          .in("channel_id", channelIds)
          .order("posted_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length > 0
      ? supabase
          .from("instagram_messages")
          .select("conversation_id, sender, body, sent_at")
          .in("conversation_id", conversationIds)
          .order("sent_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (slackMessagesRes.error) throw slackMessagesRes.error
  if (instagramMessagesRes.error) throw instagramMessagesRes.error

  const channelById = new Map(channels.map((c) => [c.id, c.name]))
  const conversationById = new Map(conversations.map((c) => [c.id, c.participant_username]))

  const slackMessages = ((slackMessagesRes.data ?? []) as SlackMessageRow[]).map((m) => {
    // Defensa en profundidad: el mensaje solo puede pertenecer a un canal que
    // ya verificamos que es de este cliente. Si channel_id no está en el mapa,
    // algo se coló fuera del filtro `.in(channelIds)` — no debería pasar nunca.
    const channelName = channelById.get(m.channel_id)
    if (channelName === undefined) {
      throw new ClientIsolationError("slack_messages", clientId, `channel_id=${m.channel_id} ajeno al cliente`)
    }
    return { ...m, channelName }
  })

  const instagramMessages = ((instagramMessagesRes.data ?? []) as InstagramMessageRow[]).map((m) => {
    if (!conversationById.has(m.conversation_id)) {
      throw new ClientIsolationError("instagram_messages", clientId, `conversation_id=${m.conversation_id} ajeno al cliente`)
    }
    return { ...m, participantUsername: conversationById.get(m.conversation_id) ?? null }
  })

  return { clientId, mentorKnowledge, leads, slackMessages, instagramMessages }
}

export function renderSystemPrompt(context: ClientContext): string {
  const sections: string[] = []

  const byLayer = (layer: MentorKnowledgeRow["layer"]) =>
    context.mentorKnowledge.filter((k) => k.layer === layer)

  const framework = byLayer("framework")
  if (framework.length > 0) {
    sections.push(
      "## Framework / metodología\n" + framework.map((k) => `### ${k.title}\n${k.content}`).join("\n\n")
    )
  }

  const vocabulario = byLayer("vocabulario")
  if (vocabulario.length > 0) {
    sections.push(
      "## Vocabulario / estilo\n" + vocabulario.map((k) => `### ${k.title}\n${k.content}`).join("\n\n")
    )
  }

  const casos = byLayer("casos")
  if (casos.length > 0) {
    sections.push("## Casos de referencia\n" + casos.map((k) => `### ${k.title}\n${k.content}`).join("\n\n"))
  }

  if (context.leads.length > 0) {
    sections.push(
      "## Leads recientes\n" +
        context.leads
          .map((l) => `- ${l.name ?? "(sin nombre)"} · ${l.source ?? "?"} · rating ${l.rating ?? "?"} · ${l.status}`)
          .join("\n")
    )
  }

  if (context.slackMessages.length > 0) {
    sections.push(
      "## Mensajes de Slack recientes\n" +
        context.slackMessages
          .map((m) => `[#${m.channelName}] ${m.user_name ?? "?"}: ${m.body ?? ""}`)
          .join("\n")
    )
  }

  if (context.instagramMessages.length > 0) {
    sections.push(
      "## Mensajes de Instagram recientes\n" +
        context.instagramMessages
          .map((m) => `[${m.participantUsername ?? "?"}] ${m.sender}: ${m.body ?? ""}`)
          .join("\n")
    )
  }

  return sections.join("\n\n")
}
