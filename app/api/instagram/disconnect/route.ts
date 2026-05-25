import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { createServiceClient } from "@/lib/supabase/server"

export async function DELETE() {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try { user = await requireAuth() } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const sb = createServiceClient() as any

  // 1. Delete instagram_accounts for this user
  const { error: igErr } = await sb
    .from("instagram_accounts")
    .delete()
    .eq("user_id", user.id)

  if (igErr) {
    console.error("instagram_accounts delete error:", igErr)
    return NextResponse.json({ error: igErr.message }, { status: 500 })
  }

  // 2. Delete integration record for this user
  const { error: intErr } = await sb
    .from("integrations")
    .delete()
    .eq("provider", "instagram")
    .eq("created_by", user.id)

  if (intErr) {
    console.error("integrations delete error:", intErr)
    return NextResponse.json({ error: intErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
