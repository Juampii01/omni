import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export async function GET(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("kanban_tasks")
    .select("*")
    .eq("client_id", ctx.clientId)
    .order("order", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { title, columnId, description, labelText, labelColor, priority } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "title es obligatorio" }, { status: 400 })

  const supabase = createServiceClient()

  const { count } = await supabase
    .from("kanban_tasks")
    .select("id", { count: "exact", head: true })
    .eq("client_id", ctx.clientId)
    .eq("column_id", columnId ?? "por-hacer")

  const { data, error } = await supabase
    .from("kanban_tasks")
    .insert({
      client_id: ctx.clientId,
      title,
      description: description ?? "",
      column_id: columnId ?? "por-hacer",
      label_text: labelText ?? "",
      label_color: labelColor ?? "",
      priority: priority ?? "con-tiempo",
      order: count ?? 0,
      created_by: ctx.user.id,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}
