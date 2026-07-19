import { NextRequest, NextResponse } from "next/server"
import { requireInternal } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

// Mecanismo PRIMARIO para evitar superposición IA/humano — no un fallback.
// La detección automática de envío manual (webhook echo) es una capa
// extra, pero este botón tiene que existir y funcionar independientemente
// de si esa detección resulta confiable en la práctica.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("ig_conversation_state")
    .update({ owner: "escalado_humano", owner_changed_at: new Date().toISOString(), owner_changed_by: ctx.user.id })
    .eq("id", id)
    .eq("client_id", ctx.clientId)
    .neq("owner", "cerrado")
    .select("id, owner, owner_changed_at")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Conversación no encontrada o ya cerrada" }, { status: 404 })

  // No hace falta cancelar una respuesta de IA que ya estuviera en cola:
  // tryClaimAiSend (conversation-ownership.ts) revalida owner de forma
  // atómica justo antes de mandar, así que si había algo generado
  // esperando, el envío va a fallar solo por este mismo UPDATE.
  return NextResponse.json({ state: data })
}
