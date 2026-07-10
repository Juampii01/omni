// Procesa la cola de automation_events — pensado para correr cada 5 min
// (vercel.json). Reintentos con backoff exponencial (2,4,8,16,32,60 min),
// se marca 'failed' después de 5 intentos. Un evento roto nunca bloquea a
// los demás — cada uno se procesa y persiste su resultado por separado.
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"
import { processAutomationEvent } from "@/lib/omni/automation-engine"

export const maxDuration = 60

const MAX_ATTEMPTS = 5
const BATCH_SIZE = 25

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization")
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data: events, error } = await supabase
    .from("automation_events")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{ eventId: string; result: string }> = []

  for (const event of events ?? []) {
    await supabase.from("automation_events").update({ status: "processing" }).eq("id", event.id)

    try {
      const { workflowsMatched } = await processAutomationEvent({
        id: event.id,
        client_id: event.client_id,
        event_type: event.event_type,
        payload: (event.payload as Record<string, unknown>) ?? {},
      })
      await supabase.from("automation_events").update({ status: "done" }).eq("id", event.id)
      results.push({ eventId: event.id, result: `done (${workflowsMatched} workflow(s) disparado(s))` })
    } catch (e) {
      const attempts = (event.attempts ?? 0) + 1
      const failed = attempts >= MAX_ATTEMPTS
      const backoffMinutes = Math.min(2 ** attempts, 60)
      await supabase
        .from("automation_events")
        .update({
          status: failed ? "failed" : "pending",
          attempts,
          next_attempt_at: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
        })
        .eq("id", event.id)
      results.push({ eventId: event.id, result: failed ? `failed: ${e instanceof Error ? e.message : "error"}` : `retry en ${backoffMinutes}m` })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
