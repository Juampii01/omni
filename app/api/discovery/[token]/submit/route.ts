import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"

// Ruta pública — sin auth, el share_token ES la credencial. El prospecto
// marca la entrevista como enviada; generar el resumen estructurado sigue
// siendo una acción manual de la agencia desde /admin/discovery/[id]
// (revisa la transcripción antes de darla por definitiva).
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: session, error: fetchError } = await supabase
    .from("discovery_sessions")
    .select("id, messages, submitted_at")
    .eq("share_token", token)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: "Link inválido" }, { status: 404 })
  if (session.submitted_at) return NextResponse.json({ ok: true })
  if (!session.messages || (session.messages as unknown[]).length === 0) {
    return NextResponse.json({ error: "Todavía no respondiste ninguna pregunta" }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from("discovery_sessions")
    .update({ submitted_at: new Date().toISOString() })
    .eq("share_token", token)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await supabase.from("audit_logs").insert({
    client_id: null,
    actor_id: null,
    action: "discovery.submitted_by_prospect",
    resource: `discovery_session:${session.id}`,
    metadata: {},
  })

  return NextResponse.json({ ok: true })
}
