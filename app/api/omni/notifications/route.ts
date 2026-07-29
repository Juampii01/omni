import { NextRequest, NextResponse } from "next/server"
import { requireAuth, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

export async function GET(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("client_id", ctx.clientId)
    .order("created_at", { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}
