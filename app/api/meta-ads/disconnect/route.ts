import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"

export async function DELETE() {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try { user = await requireAuth() } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = await createClient()
  const sb = supabase as any

  // Verificar que la cuenta pertenece a este usuario antes de modificarla
  const { data: account, error: findErr } = await sb
    .from("meta_ads_accounts")
    .select("id, user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (findErr) {
    return NextResponse.json({ error: "Error buscando cuenta" }, { status: 500 })
  }

  if (!account) {
    // No había cuenta activa — nada que desconectar
    return NextResponse.json({ ok: true, message: "No había cuenta conectada" })
  }

  // Propiedad confirmada — desactivar
  const { error: updateErr } = await sb
    .from("meta_ads_accounts")
    .update({ is_active: false })
    .eq("id", account.id)
    .eq("user_id", user.id) // doble verificación

  if (updateErr) {
    return NextResponse.json({ error: "Error desconectando cuenta" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
