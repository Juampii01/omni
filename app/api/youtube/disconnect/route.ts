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

  // Verify ownership before touching the row
  const { data: channel, error: findErr } = await sb
    .from("youtube_channels")
    .select("id, user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (findErr) {
    return NextResponse.json({ error: "Error buscando canal" }, { status: 500 })
  }

  if (!channel) {
    return NextResponse.json({ ok: true, message: "No había canal conectado" })
  }

  // Ownership confirmed — deactivate
  const { error: updateErr } = await sb
    .from("youtube_channels")
    .update({ is_active: false })
    .eq("id", channel.id)
    .eq("user_id", user.id) // belt + suspenders

  if (updateErr) {
    return NextResponse.json({ error: "Error desconectando canal" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
