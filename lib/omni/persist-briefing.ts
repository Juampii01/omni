// Persistencia compartida de un resultado de análisis (leads/prospecting/
// community/unanswered) en daily_briefings + notificación in-app si hay
// hallazgos. Usado tanto por el trigger manual
// (/api/omni/briefings/generate) como por el cron diario
// (/api/cron/daily-briefings) para no duplicar esta lógica.

import { createServiceClient } from "@/lib/supabase-service"
import { emitOmniEvent } from "@/lib/omni/automation-events"

export type BriefingType = "leads" | "prospecting" | "community" | "unanswered"

function buildNotificationTitle(type: BriefingType, count: number): string {
  if (type === "unanswered") return `Tenés ${count} conversación${count > 1 ? "es" : ""} sin responder`
  const label = { leads: "de leads", prospecting: "de prospección", community: "de comunidad" }[type]
  return `Nuevo análisis ${label}: ${count} hallazgo${count > 1 ? "s" : ""}`
}

function extractHeadline(finding: unknown): string {
  const f = finding as { titulo?: string; situacion?: string; participante?: string; ultimo_mensaje?: string }
  if (f?.titulo) return f.titulo
  if (f?.situacion) return f.situacion
  if (f?.participante) return `@${f.participante}: "${f.ultimo_mensaje ?? ""}"`
  return ""
}

export async function persistBriefingResult(
  clientId: string,
  type: BriefingType,
  findings: unknown[],
  messagesAnalyzed: number
) {
  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: briefing, error } = await supabase
    .from("daily_briefings")
    .upsert({ client_id: clientId, date: today, type, findings, messages_analyzed: messagesAnalyzed }, { onConflict: "client_id,date,type" })
    .select("*")
    .single()

  if (error) throw new Error(error.message)

  if (findings.length > 0) {
    await supabase.from("notifications").insert({
      client_id: clientId,
      title: buildNotificationTitle(type, findings.length),
      body: extractHeadline(findings[0]),
      link: "/dashboard/briefings",
    })
    await emitOmniEvent(clientId, "briefing.finding", { type, findings, messagesAnalyzed })
  }

  return briefing
}
