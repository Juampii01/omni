import { NextRequest, NextResponse } from "next/server"
import { requirePlatformAdmin } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export async function GET(req: NextRequest) {
  const ctx = await requirePlatformAdmin(getJwt(req))
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, business_name, mentor_name, created_at")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const clientIds = (clients ?? []).map((c) => c.id)
  const [{ data: profileCounts }, { data: leadCounts }] = await Promise.all([
    supabase.from("profiles").select("client_id").in("client_id", clientIds),
    supabase.from("leads").select("client_id").in("client_id", clientIds),
  ])

  const countBy = (rows: { client_id: string | null }[] | null) => {
    const map = new Map<string, number>()
    for (const r of rows ?? []) {
      if (!r.client_id) continue
      map.set(r.client_id, (map.get(r.client_id) ?? 0) + 1)
    }
    return map
  }
  const profilesByClient = countBy(profileCounts as any)
  const leadsByClient = countBy(leadCounts as any)

  const result = (clients ?? []).map((c) => ({
    ...c,
    memberCount: profilesByClient.get(c.id) ?? 0,
    leadCount: leadsByClient.get(c.id) ?? 0,
  }))

  return NextResponse.json({ clients: result })
}

export async function POST(req: NextRequest) {
  const ctx = await requirePlatformAdmin(getJwt(req))
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { clientName, ownerEmail, ownerPassword } = await req.json()
  if (!clientName?.trim() || !ownerEmail?.trim() || !ownerPassword) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
  }
  if (ownerPassword.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ name: clientName })
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

  await supabase.from("audit_logs").insert({
    client_id: client.id,
    actor_id: ctx.user.id,
    action: "client.created",
    resource: `client:${client.id}`,
    metadata: { clientName, ownerEmail },
  })

  return NextResponse.json({ ok: true, clientId: client.id })
}
