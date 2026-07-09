import { NextRequest, NextResponse } from "next/server"
import { requireInternal } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export async function GET(req: NextRequest) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, created_at")
    .eq("client_id", ctx.clientId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: users } = await supabase.auth.admin.listUsers()
  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email]))

  const members = (profiles ?? []).map((p) => ({ ...p, email: emailById.get(p.id) ?? "" }))
  return NextResponse.json({ members })
}

export async function POST(req: NextRequest) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { email, password, role, fullName } = await req.json()
  if (!email?.trim() || !password) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
  if (!["admin", "team", "client"].includes(role)) return NextResponse.json({ error: "role inválido" }, { status: 400 })

  const supabase = createServiceClient()

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (userError || !userData.user) {
    return NextResponse.json({ error: userError?.message ?? "No se pudo crear el usuario" }, { status: 500 })
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userData.user.id,
    client_id: ctx.clientId,
    role,
    full_name: fullName || null,
  })
  if (profileError) {
    await supabase.auth.admin.deleteUser(userData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  await supabase.from("audit_logs").insert({
    client_id: ctx.clientId,
    actor_id: ctx.user.id,
    action: "team_member.invited",
    resource: `profile:${userData.user.id}`,
    metadata: { email, role },
  })

  return NextResponse.json({ ok: true })
}
