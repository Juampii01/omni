import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { buildOmniSystemPrompt, OmniContextError } from "@/lib/omni/system-prompt"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY en el servidor" }, { status: 503 })

  const { description } = await req.json()
  if (!description?.trim()) return NextResponse.json({ error: "description es obligatorio" }, { status: 400 })

  let systemPrompt: string
  try {
    systemPrompt = await buildOmniSystemPrompt(ctx.clientId)
  } catch (e) {
    const msg = e instanceof OmniContextError ? e.message : "Error armando el contexto de Omni"
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const prompt = `Armá un SOP (procedimiento operativo estándar) para este negocio, respetando su vocabulario y estilo (capa 2 del contexto).

DESCRIPCIÓN DEL PROCEDIMIENTO:
${description}

Devolvé SOLO un JSON con esta forma exacta, sin markdown, sin texto adicional:
{
  "title": "título corto",
  "frequency": "ej: Semanal - Lunes, o Ad hoc",
  "tags": ["tag1", "tag2"],
  "steps": [{"order": 1, "label": "paso corto", "description": "detalle opcional"}],
  "templates": [{"channel": "slack|whatsapp|email", "label": "nombre del template", "body": "contenido del template"}]
}`

  const anthropic = new Anthropic({ apiKey })
  let raw: string
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    })
    const block = response.content.find((b) => b.type === "text")
    raw = block?.type === "text" ? block.text.trim() : "{}"
  } catch (e) {
    return NextResponse.json({ error: `Error llamando a Claude: ${e instanceof Error ? e.message : "unknown"}` }, { status: 502 })
  }

  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()
  let parsed: { title: string; frequency?: string; tags?: string[]; steps: unknown[]; templates: unknown[] }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: "Claude devolvió una respuesta que no se pudo interpretar" }, { status: 502 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("client_sops")
    .insert({
      client_id: ctx.clientId,
      title: parsed.title,
      frequency: parsed.frequency ?? null,
      tags: parsed.tags ?? [],
      steps: parsed.steps ?? [],
      templates: parsed.templates ?? [],
      ai_generated: true,
      created_by: ctx.user.id,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sop: data })
}
