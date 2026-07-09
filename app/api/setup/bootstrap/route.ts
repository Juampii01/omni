import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"

/**
 * Bootstrap de un solo uso: crea el primer client + primer usuario (role
 * "owner"). Se auto-bloquea apenas existe una fila en `clients` — no hay
 * self-signup público más allá de este primer arranque.
 */
export async function POST(req: NextRequest) {
  const { clientName, ownerEmail, ownerPassword } = await req.json()

  if (!clientName || !ownerEmail || !ownerPassword) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
  }
  if (ownerPassword.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Ya existe al menos un cliente. Bootstrap deshabilitado." }, { status: 403 })
  }

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

  return NextResponse.json({ ok: true })
}
