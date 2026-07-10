// Endpoint público — un sistema externo (Zapier del lado del cliente,
// un formulario, lo que sea) puede disparar UN workflow puntual. Se
// autentica con un secret propio de ese workflow (no hay sesión de
// usuario acá, es server-to-server).
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"
import { emitOmniEvent } from "@/lib/omni/automation-events"

export async function POST(req: NextRequest, { params }: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = await params
  const url = new URL(req.url)
  const secret = req.headers.get("x-omni-webhook-secret") ?? url.searchParams.get("secret")

  const supabase = createServiceClient()
  const { data: workflow } = await supabase
    .from("automation_workflows")
    .select("id, client_id, webhook_secret, trigger_type, is_active")
    .eq("id", workflowId)
    .maybeSingle()

  if (!workflow || workflow.trigger_type !== "webhook.incoming") {
    return NextResponse.json({ error: "Workflow no encontrado" }, { status: 404 })
  }
  if (!workflow.is_active) return NextResponse.json({ error: "Workflow inactivo" }, { status: 403 })
  if (!workflow.webhook_secret || secret !== workflow.webhook_secret) {
    return NextResponse.json({ error: "Secret inválido" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  await emitOmniEvent(workflow.client_id, "webhook.incoming", { workflowId: workflow.id, ...body })

  return NextResponse.json({ ok: true })
}
