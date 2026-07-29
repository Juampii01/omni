import { NextRequest, NextResponse } from "next/server"
import { requirePlatformAdmin, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { generateDiscoveryOpening, type DiscoveryMessage } from "@/lib/omni/discovery"

export const maxDuration = 60

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePlatformAdmin(getJwt(req))
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("discovery_sessions").select("*").eq("id", id).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  return NextResponse.json({ item: data })
}

// Guarda el contexto previo que la agencia ya tiene sobre el prospecto. Si
// la sesión todavía no tiene mensajes, además genera el mensaje de apertura
// para que el prospecto no arranque en frío — si ya está en curso, solo se
// guarda el contexto (moldea los turnos siguientes vía el system prompt),
// sin tocar la transcripción existente.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePlatformAdmin(getJwt(req))
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const { priorContext } = await req.json()
  if (typeof priorContext !== "string") return NextResponse.json({ error: "priorContext es obligatorio" }, { status: 400 })

  const supabase = createServiceClient()
  const { data: session, error: fetchError } = await supabase
    .from("discovery_sessions")
    .select("id, prospect_name, niche, messages")
    .eq("id", id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })

  const history = (session.messages as DiscoveryMessage[]) ?? []
  const update: { prior_context: string; messages?: DiscoveryMessage[] } = { prior_context: priorContext }

  if (history.length === 0 && priorContext.trim()) {
    try {
      const opening = await generateDiscoveryOpening({ prospectName: session.prospect_name, niche: session.niche, priorContext })
      update.messages = [{ role: "assistant", content: opening }]
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo generar el mensaje de apertura" }, { status: 502 })
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("discovery_sessions")
    .update(update)
    .eq("id", id)
    .select("*")
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ item: updated })
}
