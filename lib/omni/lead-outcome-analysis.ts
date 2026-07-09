// Análisis de calidad de leads vs. cómo terminaron cerrando — cruza señales
// de entrada del lead (rating, fuente, nicho, notas) con los términos del
// cierre (pago único vs. cuotas, monto, duración) para detectar patrones.
// Portado del piloto de Ann (Smart-Scale) — misma lógica y mismo prompt,
// adaptado a `client_id` obligatorio y a que acá el resultado del cierre
// vive directo en `leads` (no hay `crm_clients`/`crm_installments` acá,
// porque `clients` ya significa "tenant que usa Omni", no "cliente cerrado
// de este negocio puntual").

import { createServiceClient } from "@/lib/supabase-service"
import { buildOmniSystemPrompt } from "@/lib/omni/system-prompt"
import Anthropic from "@anthropic-ai/sdk"
import type { SlackFinding } from "@/lib/omni/types"

const LOOKBACK_DAYS = 60

export interface LeadOutcomeAnalysisResult {
  findings: SlackFinding[]
  leadsAnalyzed: number
}

export class LeadOutcomeAnalysisError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function runLeadOutcomeAnalysis(clientId: string): Promise<LeadOutcomeAnalysisResult> {
  if (!clientId) throw new LeadOutcomeAnalysisError("client_id es obligatorio", 400)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new LeadOutcomeAnalysisError("Falta ANTHROPIC_API_KEY en el servidor", 503)

  let systemPrompt: string
  try {
    systemPrompt = await buildOmniSystemPrompt(clientId)
  } catch (e) {
    throw new LeadOutcomeAnalysisError(e instanceof Error ? e.message : "Error armando el contexto de Omni", 500)
  }

  const supabase = createServiceClient()
  const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()

  const { data: leads, error: leadsErr } = await supabase
    .from("leads")
    .select(
      "id, client_id, name, rating, source, lead_type, niche, tag, notes, purchased, deal_type, deal_amount, deal_installments, deal_installments_paid, deal_duration_months, created_at"
    )
    .eq("client_id", clientId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })

  if (leadsErr) throw new LeadOutcomeAnalysisError(leadsErr.message, 500)

  // Defensa en profundidad: nada de otro cliente debería poder colarse acá,
  // ya filtramos por client_id arriba, pero lo confirmamos igual.
  for (const lead of leads ?? []) {
    if (lead.client_id !== clientId) {
      throw new LeadOutcomeAnalysisError(
        `Aislamiento violado: lead ${lead.id} pertenece a client_id=${lead.client_id}, se esperaba ${clientId}`,
        500
      )
    }
  }

  if (!leads || leads.length === 0) {
    throw new LeadOutcomeAnalysisError("No hay leads cargados en los últimos 60 días.", 400)
  }

  const closedLeads = leads.filter((l) => l.purchased)

  const closedSummaries = closedLeads.map((l) => ({
    lead: l.name,
    rating: l.rating,
    fuente: l.source,
    nicho: l.niche,
    notas: l.notes,
    pago:
      l.deal_type === "suscripcion"
        ? "suscripción mensual"
        : (l.deal_installments ?? 1) <= 1
          ? "pago único"
          : `${l.deal_installments} cuotas`,
    monto_total: l.deal_amount,
    duracion_meses: l.deal_duration_months,
    cuotas_pagadas: l.deal_installments ? `${l.deal_installments_paid ?? 0}/${l.deal_installments}` : null,
  }))

  const leadsSummary = leads.map((l) => ({
    nombre: l.name,
    rating: l.rating,
    fuente: l.source,
    tipo: l.lead_type,
    nicho: l.niche,
    tag: l.tag,
    notas: l.notes,
    compro: l.purchased,
  }))

  const prompt = `Te paso datos de leads y de cómo terminaron cerrando (o no cerrando), para que evalúes qué tan calificados están llegando y si hay patrones entre cómo entra alguien y cómo termina cerrando.

LEADS de los últimos ${LOOKBACK_DAYS} días (${leadsSummary.length}):
${JSON.stringify(leadsSummary, null, 1)}

CLIENTES CERRADOS de los últimos ${LOOKBACK_DAYS} días con lead de origen conocido (${closedSummaries.length}):
${JSON.stringify(closedSummaries, null, 1)}

Analizá esta información y buscá patrones reales — no inventes nada que no esté sustentado en los datos. Ejemplos del tipo de patrón que buscamos (no busques exactamente esto, es solo ilustrativo):
- Leads con rating bajo o de cierta fuente que igual cerraron, y en qué términos (pago único vs. cuotas puede ser señal de menor compromiso, pero no es una regla fija — evaluá caso por caso).
- Fuentes o nichos con mayor tasa de cierre en términos favorables (cuotas, montos mayores) vs. cierres "débiles".
- Cualquier señal de que la calificación del lead (rating, notas) no se está correspondiendo con la calidad real del cierre.

Presentalo SIEMPRE como hipótesis a revisar, nunca como hecho confirmado — con pocos casos, correlación no es causalidad. Si los datos no alcanzan para un patrón real, está bien devolver pocos hallazgos o ninguno.

Para cada hallazgo real que encuentres, devolvé:
- "titulo": título corto (4-8 palabras)
- "descripcion": 2-3 oraciones explicando el patrón, en español, tono directo y ejecutivo, dejando claro que es una hipótesis a revisar
- "canales": array con los nombres de los leads/clientes involucrados en el hallazgo
- "evidencia": un dato concreto corto que sustenta el hallazgo (ej: "3 de 4 pagos únicos vinieron de la misma fuente")
- "severidad": "alta" | "media" | "baja"

Respondé SOLO con un JSON array de hallazgos. Si no hay nada relevante, devolvé un array vacío []. Sin markdown, sin texto adicional.`

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
    throw new LeadOutcomeAnalysisError(`Error llamando a Claude: ${e instanceof Error ? e.message : "unknown"}`, 502)
  }

  const raw = msg.content.find((b) => b.type === "text")
  const text = raw?.type === "text" ? raw.text.trim() : "[]"
  const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()

  let findings: SlackFinding[]
  try {
    findings = JSON.parse(cleaned)
    if (!Array.isArray(findings)) throw new Error("La respuesta no fue un array")
  } catch (e) {
    console.error("[omni/lead-outcome-analysis] parse error:", e instanceof Error ? e.message : e, cleaned.slice(0, 300))
    throw new LeadOutcomeAnalysisError("Claude devolvió una respuesta que no se pudo interpretar", 502)
  }

  return { findings, leadsAnalyzed: leadsSummary.length }
}
