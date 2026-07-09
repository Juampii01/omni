import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { layer, title, content } = await req.json()
  if (!["framework", "vocabulario", "casos"].includes(layer)) {
    return NextResponse.json({ error: "layer inválido" }, { status: 400 })
  }
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "title y content son obligatorios" }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("client_mentor_knowledge")
    .insert({ client_id: ctx.clientId, layer, title, content, created_by: ctx.user.id })
    .select("id, layer, title, content, sort_order, is_active")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}
