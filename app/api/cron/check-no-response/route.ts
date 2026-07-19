// Sweep periódico para el único trigger de "no cerró" que no es reactivo a
// un mensaje entrante: 48hs sin respuesta del lead desde nuestro último
// mensaje. Los otros 3 triggers (dice que no / pide humano / "lo voy a
// pensar" sin fecha) se detectan en closing-engine.ts al llegar cada
// mensaje del lead, no acá.
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"
import { markManyNoCerro, escalateManyToHuman } from "@/lib/omni/conversation-ownership"

export const maxDuration = 60

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000
// Defensivo: acota cuántas filas procesa una sola corrida. Si stale.length
// llega justo a BATCH_LIMIT, puede haber más filas obsoletas de las que
// esta corrida procesa — no hace falta paginar dentro de una misma
// ejecución, porque el cron vuelve a correr cada N minutos (vercel.json) y
// esas filas siguen apareciendo en la próxima corrida hasta que se
// procesen (el filtro es por antigüedad, no se "vencen" ni se pierden).
const BATCH_LIMIT = 500

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization")
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const supabase = createServiceClient()
    const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS).toISOString()

    const { data: stale, error } = await supabase
      .from("ig_conversation_state")
      .select("id, client_id, conversation_id")
      .eq("owner", "ia_activa")
      .lt("last_lead_message_at", cutoff)
      .limit(BATCH_LIMIT)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!stale || stale.length === 0) return NextResponse.json({ escalated: 0, skipped: 0, total: 0 })

    const staleIds = stale.map((s) => s.id)
    const markedIds = await markManyNoCerro(staleIds)
    const skipped = staleIds.length - markedIds.length

    // TODO: sin actorId, si alguna de estas filas ya está en escalado_humano
    // por un humano real (no por este cron), esto pisa owner_changed_by a
    // null y borra ese rastro — hallazgo aparte, no forma parte de esta fase.
    await escalateManyToHuman(markedIds, "no_cerro")

    const markedSet = new Set(markedIds)
    for (const state of stale) {
      if (!markedSet.has(state.id)) continue
      // Fase 1: placeholder — igual que en closing-engine.ts, la integración
      // real de WhatsApp se conecta después, a pedido explícito.
      console.log(`[cron/check-no-response][ALERTA WHATSAPP - PLACEHOLDER] client_id=${state.client_id} conversation_id=${state.conversation_id} motivo=48hs_sin_respuesta`)
    }

    return NextResponse.json({ escalated: markedIds.length, skipped, total: staleIds.length })
  } catch (e) {
    console.error(`[cron/check-no-response] Error inesperado: ${e instanceof Error ? e.message : e}`)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
