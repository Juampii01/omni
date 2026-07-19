// Sweep periódico para el único trigger de "no cerró" que no es reactivo a
// un mensaje entrante: 48hs sin respuesta del lead desde nuestro último
// mensaje. Los otros 3 triggers (dice que no / pide humano / "lo voy a
// pensar" sin fecha) se detectan en closing-engine.ts al llegar cada
// mensaje del lead, no acá.
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"
import { markNoCerro, escalateToHuman } from "@/lib/omni/conversation-ownership"

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization")
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS).toISOString()

  const { data: stale, error } = await supabase
    .from("ig_conversation_state")
    .select("id, client_id, conversation_id")
    .eq("owner", "ia_activa")
    .lt("last_lead_message_at", cutoff)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let skipped = 0
  for (const state of stale ?? []) {
    const marked = await markNoCerro(state.id)
    if (!marked) {
      skipped++
      console.log(`[cron/check-no-response] no_cerro no aplicado — owner ya no era ia_activa. state_id=${state.id}`)
      continue
    }
    // TODO: sin actorId, si esta fila ya está en escalado_humano por un humano real (no por este cron), esto pisa owner_changed_by a null y borra ese rastro — hallazgo aparte, no forma parte del bug #4.
    await escalateToHuman(state.id, "no_cerro")
    // Fase 1: placeholder — igual que en closing-engine.ts, la integración
    // real de WhatsApp se conecta después, a pedido explícito.
    console.log(`[cron/check-no-response][ALERTA WHATSAPP - PLACEHOLDER] client_id=${state.client_id} conversation_id=${state.conversation_id} motivo=48hs_sin_respuesta`)
  }

  return NextResponse.json({ escalated: (stale?.length ?? 0) - skipped, skipped, total: stale?.length ?? 0 })
}
