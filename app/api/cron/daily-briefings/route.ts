// Cron diario multi-tenant — portado de Smart-Scale
// (app/api/cron/omni-daily-briefing/route.ts), que corría para una sola
// cuenta. Acá recorre TODOS los clients y, por cada uno, corre en paralelo
// las análisis que correspondan según qué tenga conectado: leads siempre
// (no depende de integración), prospección + resumen de sin-responder si
// hay Instagram conectado. La rama de comunidad (Slack) se agrega cuando
// exista runCommunityAnalysis — mismo patrón condicionado a
// slack_connected_at, y el resumen de sin-responder se extiende ahí mismo
// (buildUnansweredDigest ya está armado para sumar platform:"slack").
//
// Un cliente sin leads/conversaciones sincronizadas no rompe el cron para
// el resto — cada análisis se captura por separado.

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"
import { runLeadOutcomeAnalysis } from "@/lib/omni/lead-outcome-analysis"
import { runProspectingRiskAnalysis } from "@/lib/omni/prospecting-risk-analysis"
import { buildUnansweredDigest } from "@/lib/omni/unanswered-digest"
import { persistBriefingResult } from "@/lib/omni/persist-briefing"

export const maxDuration = 90

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization")
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
}

async function runLeadsFor(clientId: string) {
  try {
    const result = await runLeadOutcomeAnalysis(clientId)
    await persistBriefingResult(clientId, "leads", result.findings, result.leadsAnalyzed)
    return `ok: ${result.findings.length} hallazgo(s)`
  } catch (e) {
    return `skip: ${e instanceof Error ? e.message : "error"}`
  }
}

async function runProspectingFor(clientId: string) {
  try {
    const result = await runProspectingRiskAnalysis(clientId)
    await persistBriefingResult(clientId, "prospecting", result.findings, result.conversationsAnalyzed)
    return `ok: ${result.findings.length} hallazgo(s)`
  } catch (e) {
    return `skip: ${e instanceof Error ? e.message : "error"}`
  }
}

async function runUnansweredFor(clientId: string) {
  try {
    const result = await buildUnansweredDigest(clientId)
    await persistBriefingResult(clientId, "unanswered", result.findings, result.conversationsChecked)
    return `ok: ${result.findings.length} sin responder`
  } catch (e) {
    return `skip: ${e instanceof Error ? e.message : "error"}`
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data: clients, error } = await supabase.from("clients").select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{ clientId: string; leads: string; prospecting?: string; unanswered?: string }> = []

  for (const client of clients ?? []) {
    const { data: config } = await supabase
      .from("client_config")
      .select("ig_connected_at")
      .eq("client_id", client.id)
      .maybeSingle()

    const hasInstagram = !!config?.ig_connected_at

    const [leads, prospecting, unanswered] = await Promise.all([
      runLeadsFor(client.id),
      hasInstagram ? runProspectingFor(client.id) : Promise.resolve(undefined),
      hasInstagram ? runUnansweredFor(client.id) : Promise.resolve(undefined),
    ])

    results.push({
      clientId: client.id,
      leads,
      ...(prospecting ? { prospecting } : {}),
      ...(unanswered ? { unanswered } : {}),
    })
  }

  return NextResponse.json({ processed: results.length, results })
}
