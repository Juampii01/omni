import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("kanban_comments")
    .select("id, body, author_id, created_at")
    .eq("task_id", id)
    .eq("client_id", ctx.clientId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: "body es obligatorio" }, { status: 400 })
  if (body.length > 2000) return NextResponse.json({ error: "Máximo 2000 caracteres" }, { status: 400 })

  const supabase = createServiceClient()

  const { data: task } = await supabase.from("kanban_tasks").select("id").eq("id", id).eq("client_id", ctx.clientId).maybeSingle()
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })

  const { data, error } = await supabase
    .from("kanban_comments")
    .insert({ task_id: id, client_id: ctx.clientId, author_id: ctx.user.id, body })
    .select("id, body, author_id, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}
