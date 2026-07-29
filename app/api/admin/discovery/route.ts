import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { requirePlatformAdmin, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

export async function GET(req: NextRequest) {
  const ctx = await requirePlatformAdmin(getJwt(req))
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("discovery_sessions")
    .select("id, prospect_name, niche, status, converted_client_id, submitted_at, created_at, updated_at")
    .order("updated_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await requirePlatformAdmin(getJwt(req))
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { prospectName, niche } = await req.json()
  if (!prospectName?.trim()) return NextResponse.json({ error: "prospectName es obligatorio" }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("discovery_sessions")
    .insert({
      prospect_name: prospectName,
      niche: niche || null,
      created_by: ctx.user.id,
      share_token: randomBytes(24).toString("base64url"),
    })
    .select("*")
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? "No se pudo crear la sesión" }, { status: 500 })

  await supabase.from("audit_logs").insert({
    client_id: null,
    actor_id: ctx.user.id,
    action: "discovery.created",
    resource: `discovery_session:${data.id}`,
    metadata: { prospectName, niche: niche || null },
  })

  return NextResponse.json({ item: data })
}
