import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"

// Ruta pública — sin auth, el share_token ES la credencial (mismo criterio
// que automation_workflows.webhook_secret). Solo devuelve lo que el
// prospecto necesita ver, nunca summary/created_by/converted_client_id/id.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("discovery_sessions")
    .select("prospect_name, niche, messages, submitted_at")
    .eq("share_token", token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Link inválido" }, { status: 404 })

  return NextResponse.json({
    prospectName: data.prospect_name,
    niche: data.niche,
    messages: data.messages,
    submitted: !!data.submitted_at,
  })
}
