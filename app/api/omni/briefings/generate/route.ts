import { NextRequest, NextResponse } from "next/server"
import { requireInternal } from "@/lib/auth/api-guards"
import { runLeadOutcomeAnalysis, LeadOutcomeAnalysisError } from "@/lib/omni/lead-outcome-analysis"
import { runProspectingRiskAnalysis, ProspectingRiskAnalysisError } from "@/lib/omni/prospecting-risk-analysis"
import { buildUnansweredDigest } from "@/lib/omni/unanswered-digest"
import { persistBriefingResult, type BriefingType } from "@/lib/omni/persist-briefing"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export async function POST(req: NextRequest) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const type = ((body?.type as string) ?? "leads") as BriefingType
  if (!["leads", "prospecting", "community", "unanswered"].includes(type)) {
    return NextResponse.json({ error: "type inválido" }, { status: 400 })
  }

  let findings: unknown[]
  let messagesAnalyzed: number

  try {
    if (type === "leads") {
      const result = await runLeadOutcomeAnalysis(ctx.clientId)
      findings = result.findings
      messagesAnalyzed = result.leadsAnalyzed
    } else if (type === "prospecting") {
      const result = await runProspectingRiskAnalysis(ctx.clientId)
      findings = result.findings
      messagesAnalyzed = result.conversationsAnalyzed
    } else if (type === "unanswered") {
      const result = await buildUnansweredDigest(ctx.clientId)
      findings = result.findings
      messagesAnalyzed = result.conversationsChecked
    } else {
      return NextResponse.json({ error: "Análisis de comunidad todavía no está disponible" }, { status: 501 })
    }
  } catch (e) {
    const status = e instanceof LeadOutcomeAnalysisError || e instanceof ProspectingRiskAnalysisError ? e.status : 500
    const message = e instanceof Error ? e.message : "Error generando el análisis"
    return NextResponse.json({ error: message }, { status })
  }

  try {
    const briefing = await persistBriefingResult(ctx.clientId, type, findings, messagesAnalyzed)
    return NextResponse.json({ briefing })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error guardando el análisis" }, { status: 500 })
  }
}
