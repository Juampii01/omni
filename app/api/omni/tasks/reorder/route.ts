import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

type Change = { id: string; columnId: string; order: number }

export async function POST(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { changes } = (await req.json()) as { changes: Change[] }
  if (!Array.isArray(changes) || changes.length === 0 || changes.length > 200) {
    return NextResponse.json({ error: "changes inválido" }, { status: 400 })
  }

  const supabase = createServiceClient()
  const results = await Promise.all(
    changes.map((c) =>
      supabase
        .from("kanban_tasks")
        .update({ column_id: c.columnId, order: c.order })
        .eq("id", c.id)
        .eq("client_id", ctx.clientId)
    )
  )

  const failed = results.find((r) => r.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
