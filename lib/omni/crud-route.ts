import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

/** Genera GET (list) + POST (create) para una tabla client_id-scoped simple. */
export function listCreateHandlers(table: string, insertableFields: readonly string[]) {
  async function GET(req: NextRequest) {
    const ctx = await requireAuth(getJwt(req))
    if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("client_id", ctx.clientId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data ?? [] })
  }

  async function POST(req: NextRequest) {
    const ctx = await requireAuth(getJwt(req))
    if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const insert: Record<string, unknown> = { client_id: ctx.clientId }
    for (const key of insertableFields) if (key in body) insert[key] = body[key]

    const supabase = createServiceClient()
    const { data, error } = await supabase.from(table).insert(insert).select("*").single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  }

  return { GET, POST }
}

/** Genera PATCH + DELETE para una fila puntual de una tabla client_id-scoped. */
export function itemHandlers(table: string, patchableFields: readonly string[]) {
  async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const ctx = await requireAuth(getJwt(req))
    if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const patch: Record<string, unknown> = {}
    for (const key of patchableFields) if (key in body) patch[key] = body[key]

    const supabase = createServiceClient()
    const { error } = await supabase.from(table).update(patch).eq("id", id).eq("client_id", ctx.clientId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const ctx = await requireAuth(getJwt(req))
    if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const supabase = createServiceClient()
    const { error } = await supabase.from(table).delete().eq("id", id).eq("client_id", ctx.clientId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return { PATCH, DELETE }
}
