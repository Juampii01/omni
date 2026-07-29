import { NextRequest, NextResponse } from "next/server"
import { requirePlatformAdmin, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePlatformAdmin(getJwt(req))
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const { ownerEmail, ownerPassword } = await req.json()
  if (!ownerEmail?.trim() || !ownerPassword) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
  }
  if (ownerPassword.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: session, error: fetchError } = await supabase
    .from("discovery_sessions")
    .select("id, prospect_name, converted_client_id")
    .eq("id", id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  if (session.converted_client_id) {
    return NextResponse.json({ error: "Esta sesión ya se convirtió en un cliente" }, { status: 400 })
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ name: session.prospect_name })
    .select("id")
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: clientError?.message ?? "No se pudo crear el cliente" }, { status: 500 })
  }

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
  })

  if (userError || !userData.user) {
    await supabase.from("clients").delete().eq("id", client.id)
    return NextResponse.json({ error: userError?.message ?? "No se pudo crear el usuario" }, { status: 500 })
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userData.user.id,
    client_id: client.id,
    role: "owner",
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(userData.user.id)
    await supabase.from("clients").delete().eq("id", client.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const { error: linkError } = await supabase.from("discovery_sessions").update({ converted_client_id: client.id }).eq("id", id)
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

  await supabase.from("audit_logs").insert({
    client_id: client.id,
    actor_id: ctx.user.id,
    action: "discovery.converted",
    resource: `discovery_session:${id}`,
    metadata: { ownerEmail },
  })

  return NextResponse.json({ clientId: client.id })
}
