import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"

export async function DELETE() {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = await createClient()

  // Soft-disconnect: mark integration inactive (preserves historical data)
  await (supabase as any)
    .from("integrations")
    .update({ is_active: false })
    .eq("provider", "instagram")

  return NextResponse.json({ ok: true })
}
