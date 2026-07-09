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

  const [{ data: client, error: clientError }, { data: knowledge, error: knowledgeError }] = await Promise.all([
    supabase.from("clients").select("business_name, mentor_name").eq("id", ctx.clientId).maybeSingle(),
    supabase
      .from("client_mentor_knowledge")
      .select("id, layer, title, content, sort_order, is_active")
      .eq("client_id", ctx.clientId)
      .order("layer", { ascending: true })
      .order("sort_order", { ascending: true }),
  ])

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 })
  if (knowledgeError) return NextResponse.json({ error: knowledgeError.message }, { status: 500 })

  return NextResponse.json({
    businessName: client?.business_name ?? "",
    mentorName: client?.mentor_name ?? "",
    knowledge: knowledge ?? [],
  })
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { businessName, mentorName } = await req.json()
  const supabase = createServiceClient()

  const { error } = await supabase
    .from("clients")
    .update({ business_name: businessName, mentor_name: mentorName })
    .eq("id", ctx.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
