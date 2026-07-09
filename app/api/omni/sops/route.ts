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
    .from("client_sops")
    .select("*")
    .eq("client_id", ctx.clientId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sops: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { title, description, frequency, tags, steps, templates } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "title es obligatorio" }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("client_sops")
    .insert({
      client_id: ctx.clientId,
      title,
      description: description ?? null,
      frequency: frequency ?? null,
      tags: tags ?? [],
      steps: steps ?? [],
      templates: templates ?? [],
      created_by: ctx.user.id,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sop: data })
}
