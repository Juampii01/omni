import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { buildOmniSystemPrompt, OmniContextError } from "@/lib/omni/system-prompt"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

const VALID_SCRIPT_TYPES = ["full_script", "hook", "story_beats"] as const
type ScriptType = (typeof VALID_SCRIPT_TYPES)[number]

type IdeaRow = { title: string; hook: string | null; format: string | null; notes: string | null }

function buildPrompt(scriptType: ScriptType, idea: IdeaRow): string {
  const ideaBlock = `IDEA:
Título: ${idea.title}
Hook: ${idea.hook ?? ""}
Formato: ${idea.format ?? ""}
Notas: ${idea.notes ?? ""}`

  if (scriptType === "hook") {
    return `Sos guionista profesional de contenido digital para este negocio.

${ideaBlock}

Generá 5 variantes distintas de gancho inicial (primeros 3 segundos) para esta idea — cada una con un ángulo o enfoque distinto entre sí (pregunta directa, dato/cifra concreta, afirmación fuerte, historia corta, etc.), todas en la voz de este negocio.

Devolvé SOLO un JSON con esta forma exacta:
{ "hooks": ["variante 1", "variante 2", "variante 3", "variante 4", "variante 5"] }

Sin markdown, sin texto adicional.`
  }

  if (scriptType === "story_beats") {
    return `Sos guionista profesional de contenido digital para este negocio.

${ideaBlock}

Generá una secuencia de beats narrativos para esta idea — entre 4 y 7 beats, en el orden en que aparecen. No es un guión lineal con timing: cada beat es un momento narrativo distinto (una idea, giro o punto por beat, no una oración suelta de un guión continuo).

Devolvé SOLO un JSON con esta forma exacta:
{ "beats": [{ "content": "qué se dice o pasa en este beat", "visual_note": "shot/imagen específica para este beat" }] }

Sin markdown, sin texto adicional.`
  }

  return `Sos guionista profesional de contenido digital para este negocio.

${ideaBlock}

Generá un guión completo de 30 segundos.

Devolvé SOLO un JSON con esta forma exacta:
{
  "hook": "primeros 3 segundos",
  "body": "desarrollo del concepto",
  "cta": "llamado a la acción",
  "visual_notes": "descripción visual/shots",
  "timing": {"hook": "0-3s", "body": "3-25s", "cta": "25-30s"}
}

Sin markdown, sin texto adicional.`
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY en el servidor" }, { status: 503 })

  const { ideaId, scriptType } = await req.json()
  if (!ideaId || !scriptType || !VALID_SCRIPT_TYPES.includes(scriptType)) {
    return NextResponse.json({ error: `ideaId es obligatorio y scriptType debe ser uno de: ${VALID_SCRIPT_TYPES.join(", ")}` }, { status: 400 })
  }

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
    systemPrompt = await buildOmniSystemPrompt(ctx.clientId, "contenido")
  } catch (e) {
    const msg = e instanceof OmniContextError ? e.message : "Error armando el contexto de Omni"
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const prompt = buildPrompt(scriptType, idea)
  const maxTokens = scriptType === "story_beats" ? 2000 : 1200

  const anthropic = new Anthropic({ apiKey })
  let raw: string
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
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
