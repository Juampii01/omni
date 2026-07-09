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
  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("client_id", ctx.clientId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean))]
  const { data: users } = await supabase.auth.admin.listUsers()
  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email]))

  const items = (logs ?? []).map((l) => ({ ...l, actor_email: actorIds.includes(l.actor_id) ? emailById.get(l.actor_id) ?? null : null }))
  return NextResponse.json({ items })
}
