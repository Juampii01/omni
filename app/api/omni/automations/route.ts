import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { requireInternal, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"

export async function GET(req: NextRequest) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data: workflows, error } = await supabase
    .from("automation_workflows")
    .select("*, automation_steps(id, step_order, action_type, action_config)")
    .eq("client_id", ctx.clientId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: workflows ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name, triggerType, triggerConfig, steps } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "name es obligatorio" }, { status: 400 })
  if (!["briefing.finding", "task.column_changed", "webhook.incoming", "schedule.due"].includes(triggerType)) {
    return NextResponse.json({ error: "triggerType inválido" }, { status: 400 })
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    return NextResponse.json({ error: "El workflow necesita al menos un step" }, { status: 400 })
  }
  const invalidStep = steps.find(
    (s: { actionType: string }) => !["create_task", "send_notification", "call_webhook", "ai_digest"].includes(s.actionType)
  )
  if (invalidStep) return NextResponse.json({ error: `actionType inválido: ${invalidStep.actionType}` }, { status: 400 })

  const supabase = createServiceClient()

  const { data: workflow, error: workflowError } = await supabase
    .from("automation_workflows")
    .insert({
      client_id: ctx.clientId,
      name,
      trigger_type: triggerType,
      trigger_config: triggerConfig ?? {},
      webhook_secret: triggerType === "webhook.incoming" ? randomBytes(24).toString("base64url") : null,
      created_by: ctx.user.id,
    })
    .select("*")
    .single()

  if (workflowError || !workflow) return NextResponse.json({ error: workflowError?.message ?? "No se pudo crear el workflow" }, { status: 500 })

  const { error: stepsError } = await supabase.from("automation_steps").insert(
    steps.map((s: { actionType: string; actionConfig: Record<string, unknown> }, i: number) => ({
      workflow_id: workflow.id,
      client_id: ctx.clientId,
      step_order: i,
      action_type: s.actionType,
      action_config: s.actionConfig ?? {},
    }))
  )

  if (stepsError) {
    await supabase.from("automation_workflows").delete().eq("id", workflow.id)
    return NextResponse.json({ error: stepsError.message }, { status: 500 })
  }

  return NextResponse.json({ item: workflow })
}
