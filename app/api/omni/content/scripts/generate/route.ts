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

  const { ideaId, scriptType } = await req.json()
  if (!ideaId || !scriptType) return NextResponse.json({ error: "ideaId y scriptType son obligatorios" }, { status: 400 })

  const supabase = createServiceClient()

  const { data: idea, error: ideaError } = await supabase
    .from("content_ideas")
    .select("*")
    .eq("id", ideaId)
    .eq("client_id", ctx.clientId)
    .maybeSingle()

  if (ideaError) return NextResponse.json({ error: ideaError.message }, { status: 500 })
  if (!idea) return NextResponse.json({ error: "Idea no encontrada" }, { status: 404 })

  let systemPrompt: string
  try {
    systemPrompt = await buildOmniSystemPrompt(ctx.clientId)
  } catch (e) {
    const msg = e instanceof OmniContextError ? e.message : "Error armando el contexto de Omni"
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const prompt = `Sos guionista profesional de contenido digital para este negocio.

IDEA:
Título: ${idea.title}
Hook: ${idea.hook ?? ""}
Formato: ${idea.format ?? ""}
Notas: ${idea.notes ?? ""}

Generá un guión tipo "${scriptType}" de 30 segundos.

Devolvé SOLO un JSON con esta forma exacta:
{
  "hook": "primeros 3 segundos",
  "body": "desarrollo del concepto",
  "cta": "llamado a la acción",
  "visual_notes": "descripción visual/shots",
  "timing": {"hook": "0-3s", "body": "3-25s", "cta": "25-30s"}
}

Sin markdown, sin texto adicional.`

  const anthropic = new Anthropic({ apiKey })
  let raw: string
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    })
    const block = response.content.find((b) => b.type === "text")
    raw = block?.type === "text" ? block.text.trim() : "{}"
  } catch (e) {
    return NextResponse.json({ error: `Error llamando a Claude: ${e instanceof Error ? e.message : "unknown"}` }, { status: 502 })
  }

  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()
  let script: unknown
  try {
    script = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: "Claude devolvió una respuesta que no se pudo interpretar" }, { status: 502 })
  }

  const { data, error } = await supabase
    .from("content_scripts")
    .insert({ client_id: ctx.clientId, idea_id: ideaId, script_type: scriptType, script })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ script: data })
}
