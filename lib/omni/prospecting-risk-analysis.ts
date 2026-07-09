// Análisis de riesgo de prospección — lee las conversaciones de Instagram
// recientes y detecta cuáles están en riesgo de perderse. Portado del piloto
// de Ann (Smart-Scale), mismo prompt y misma lógica, adaptado a client_id
// obligatorio.

import { createServiceClient } from "@/lib/supabase-service"
import { buildOmniSystemPrompt } from "@/lib/omni/system-prompt"
import Anthropic from "@anthropic-ai/sdk"
import type { ProspectRisk } from "@/lib/omni/types"

const LOOKBACK_DAYS = 60
const MAX_CONVERSATIONS = 60
const MESSAGES_PER_CONVERSATION = 40

export interface ProspectingRiskAnalysisResult {
  findings: ProspectRisk[]
  conversationsAnalyzed: number
}

export class ProspectingRiskAnalysisError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function runProspectingRiskAnalysis(clientId: string): Promise<ProspectingRiskAnalysisResult> {
  if (!clientId) throw new ProspectingRiskAnalysisError("client_id es obligatorio", 400)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new ProspectingRiskAnalysisError("Falta ANTHROPIC_API_KEY en el servidor", 503)

  let systemPrompt: string
  try {
    systemPrompt = await buildOmniSystemPrompt(clientId)
  } catch (e) {
    throw new ProspectingRiskAnalysisError(e instanceof Error ? e.message : "Error armando el contexto de Omni", 500)
  }

  const supabase = createServiceClient()
  const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()

  const { data: conversations, error: convError } = await supabase
    .from("instagram_conversations")
    .select("id, client_id, participant_username, last_message_at")
    .eq("client_id", clientId)
    .gte("synced_at", sinceIso)
    .order("last_message_at", { ascending: false })
    .limit(MAX_CONVERSATIONS)

  if (convError) throw new ProspectingRiskAnalysisError(convError.message, 500)
  if (!conversations || conversations.length === 0) {
    throw new ProspectingRiskAnalysisError("No hay conversaciones de Instagram sincronizadas todavía.", 400)
  }

  // Defensa en profundidad: nada de otro cliente debería poder colarse acá,
  // ya filtramos por client_id arriba, pero lo confirmamos igual.
  for (const conv of conversations) {
    if (conv.client_id !== clientId) {
      throw new ProspectingRiskAnalysisError(
        `Aislamiento violado: conversación ${conv.id} pertenece a client_id=${conv.client_id}, se esperaba ${clientId}`,
        500
      )
    }
  }

  const { data: leads } = await supabase.from("leads").select("instagram, rating, niche, notes, purchased").eq("client_id", clientId)
  const leadByUsername = new Map((leads ?? []).filter((l) => l.instagram).map((l) => [l.instagram!.replace(/^@/, ""), l]))

  const transcripts: Array<{ username: string; lead: unknown; messages: string }> = []

  for (const conv of conversations) {
    const username = conv.participant_username ?? "(desconocido)"
    const lead = leadByUsername.get(username.replace(/^@/, ""))
    if (lead?.purchased) continue // ya cerró, no es prospección en riesgo

    const { data: messages } = await supabase
      .from("instagram_messages")
      .select("sender, body, sent_at")
      .eq("conversation_id", conv.id)
      .order("sent_at", { ascending: true })
      .limit(MESSAGES_PER_CONVERSATION)

    if (!messages || messages.length === 0) continue

    transcripts.push({
      username,
      lead: lead ? { rating: lead.rating, nicho: lead.niche, notas: lead.notes } : null,
      messages: messages.map((m) => `${m.sender === "client" ? "vos" : username}: ${m.body ?? ""}`).join("\n"),
    })
  }

  if (transcripts.length === 0) {
    return { findings: [], conversationsAnalyzed: 0 }
  }

  const prompt = `Te paso conversaciones de Instagram con prospectos (leads que todavía no cerraron) de los últimos ${LOOKBACK_DAYS} días. Evaluá cada una contra tu criterio y detectá cuáles están en riesgo de perderse.

CONVERSACIONES (${transcripts.length}):
${transcripts
  .map(
    (t, i) => `--- Conversación ${i + 1}: @${t.username} ---
${t.lead ? `Datos del lead: ${JSON.stringify(t.lead)}` : "(sin datos de lead cargados)"}
${t.messages}`
  )
  .join("\n\n")}

Para cada conversación que esté en riesgo real (no todas — solo las que muestran una señal concreta de que se está por perder), devolvé:
- "prospecto": el username (sin @)
- "estado": "en_riesgo" (todavía se puede recuperar con una acción concreta) o "irremontable" (ya se perdió, no hay acción razonable)
- "situacion": 1-2 oraciones describiendo qué está pasando, en base a la conversación real
- "principio": qué principio del framework se está violando o debería aplicarse acá
- "evidencia": una cita corta y concreta de la conversación que sustenta el hallazgo
- "accion": qué hacer distinto, específico y accionable
- "severidad": "alta" | "media" | "baja"

Si una conversación está sana (el prospecto está avanzando normalmente, o simplemente está en un punto temprano sin señales de alarma), NO la incluyas. Si ninguna está en riesgo, devolvé un array vacío [].

Respondé SOLO con un JSON array. Sin markdown, sin texto adicional.`

  const anthropic = new Anthropic({ apiKey })
  let msg
  try {
    msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    })
  } catch (e) {
    throw new ProspectingRiskAnalysisError(`Error llamando a Claude: ${e instanceof Error ? e.message : "unknown"}`, 502)
  }

  const raw = msg.content.find((b) => b.type === "text")
  const text = raw?.type === "text" ? raw.text.trim() : "[]"
  const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()

  let findings: ProspectRisk[]
  try {
    findings = JSON.parse(cleaned)
    if (!Array.isArray(findings)) throw new Error("La respuesta no fue un array")
  } catch (e) {
    console.error("[omni/prospecting-risk-analysis] parse error:", e instanceof Error ? e.message : e, cleaned.slice(0, 300))
    throw new ProspectingRiskAnalysisError("Claude devolvió una respuesta que no se pudo interpretar", 502)
  }

  return { findings, conversationsAnalyzed: transcripts.length }
}
