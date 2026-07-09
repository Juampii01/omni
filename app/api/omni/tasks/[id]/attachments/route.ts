import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

const MAX_SIZE = 4 * 1024 * 1024

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("kanban_attachments")
    .select("id, file_name, file_path, size_bytes, created_at")
    .eq("task_id", id)
    .eq("client_id", ctx.clientId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const withUrls = await Promise.all(
    (data ?? []).map(async (a) => {
      const { data: signed } = await supabase.storage.from("kanban-attachments").createSignedUrl(a.file_path, 3600)
      return { ...a, url: signed?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ attachments: withUrls })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "file es obligatorio" }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Máximo 4MB por archivo" }, { status: 400 })

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${ctx.clientId}/${id}/${Date.now()}-${safeName}`

  const supabase = createServiceClient()
  const { error: uploadError } = await supabase.storage
    .from("kanban-attachments")
    .upload(path, await file.arrayBuffer(), { contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data, error } = await supabase
    .from("kanban_attachments")
    .insert({
      task_id: id,
      client_id: ctx.clientId,
      file_name: file.name,
      file_path: path,
      size_bytes: file.size,
      uploaded_by: ctx.user.id,
    })
    .select("id, file_name, file_path, size_bytes, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attachment: data })
}
