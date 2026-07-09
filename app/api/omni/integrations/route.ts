import { NextRequest, NextResponse } from "next/server"
import { requireInternal } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export async function GET(req: NextRequest) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("client_config")
    .select("ig_account_username, ig_connected_at, slack_team_name, slack_connected_at")
    .eq("client_id", ctx.clientId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    instagram: { connected: !!data?.ig_connected_at, username: data?.ig_account_username ?? null, connectedAt: data?.ig_connected_at ?? null },
    slack: { connected: !!data?.slack_connected_at, teamName: data?.slack_team_name ?? null, connectedAt: data?.slack_connected_at ?? null },
  })
}
