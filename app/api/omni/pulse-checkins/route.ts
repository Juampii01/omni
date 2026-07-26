import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { listCreateHandlers } from "@/lib/omni/crud-route"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export const { GET } = listCreateHandlers("pulse_checkins", [])

export async function POST(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { periodLabel, wins, struggles, mood } = await req.json()
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("pulse_checkins")
    .insert({
      client_id: ctx.clientId,
      submitted_by: ctx.user.id,
      period_label: periodLabel ?? null,
      wins: wins ?? "",
      struggles: struggles ?? "",
      mood: mood ?? null,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ checkin: data })
}
