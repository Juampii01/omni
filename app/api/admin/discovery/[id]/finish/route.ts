import { NextRequest, NextResponse } from "next/server"
import { requirePlatformAdmin, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { generateDiscoverySummary, type DiscoveryMessage } from "@/lib/omni/discovery"

export const maxDuration = 60

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePlatformAdmin(getJwt(req))
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const supabase = createServiceClient()
  const { data: session, error: fetchError } = await supabase
    .from("discovery_sessions")
    .select("id, prospect_name, status, messages, summary")
    .eq("id", id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })

  if (session.status === "completed" && session.summary) {
    return NextResponse.json({ summary: session.summary })
  }

  const messages = (session.messages as DiscoveryMessage[]) ?? []
  if (messages.length === 0) {
    return NextResponse.json({ error: "Todavía no hay ninguna respuesta para resumir" }, { status: 400 })
  }

  let summary
  try {
    summary = await generateDiscoverySummary(session.prospect_name, messages)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error generando el resumen" }, { status: 502 })
  }

  const { error: updateError } = await supabase.from("discovery_sessions").update({ summary, status: "completed" }).eq("id", id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await supabase.from("audit_logs").insert({
    client_id: null,
    actor_id: ctx.user.id,
    action: "discovery.completed",
    resource: `discovery_session:${id}`,
    metadata: {},
  })

  return NextResponse.json({ summary })
}
