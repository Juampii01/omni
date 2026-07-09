import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

const PATCHABLE = [
  "title",
  "description",
  "due_date",
  "label_text",
  "label_color",
  "column_id",
  "priority",
  "subtasks",
  "blocked",
  "assignees",
  "order",
] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const key of PATCHABLE) {
    if (key in body) patch[key] = body[key]
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from("kanban_tasks").update(patch).eq("id", id).eq("client_id", ctx.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const supabase = createServiceClient()
  const { error } = await supabase.from("kanban_tasks").delete().eq("id", id).eq("client_id", ctx.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
