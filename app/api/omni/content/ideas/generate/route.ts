import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { buildOmniSystemPrompt, OmniContextError } from "@/lib/omni/system-prompt"
import { stripJsonFence } from "@/lib/omni/json"
import { checkRateLimit } from "@/lib/omni/rate-limit"

export async function POST(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!(await checkRateLimit(ctx.clientId, "ideas-generate", { maxCalls: 10, windowSeconds: 60 }))) {
    return NextResponse.json({ error: "Demasiadas solicitudes, esperá un momento y volvé a intentar." }, { status: 429 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY en el servidor" }, { status: 503 })

  const { channel } = await req.json()
  const supabase = createServiceClient()

  let systemPrompt: string
  try {
    systemPrompt = await buildOmniSystemPrompt(ctx.clientId, "contenido")
  } catch (e) {
    const msg = e instanceof OmniContextError ? e.message : "Error armando el contexto de Omni"
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const { data: competitors } = await supabase
    .from("content_competitors")
    .select("name, handle, notes")
    .eq("client_id", ctx.clientId)
    .limit(10)

  const competitorsBlock = (competitors ?? []).map((c) => `- ${c.name ?? c.handle}: ${c.notes ?? ""}`).join("\n") || "(ninguno cargado)"

  const prompt = `Sos asistente creativo de contenido para este negocio. Generá 5 ideas de contenido para ${channel === "youtube" ? "YouTube" : "Instagram"}.

COMPETIDORES DE REFERENCIA:
${competitorsBlock}

Para cada idea, devolvé:
- "title": nombre/concepto corto
- "hook": frase gancho de los primeros 3 segundos
- "format": ${channel === "youtube" ? "Short o Video largo" : "Reel, Carousel o Imagen"}
- "notes": por qué esta idea resuena con la audiencia de este negocio

Respondé SOLO con un JSON array de 5 objetos. Sin markdown, sin texto adicional.`

  const anthropic = new Anthropic({ apiKey })
  let raw: string
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
    })
    const block = response.content.find((b) => b.type === "text")
    raw = block?.type === "text" ? block.text.trim() : "[]"
  } catch (e) {
    return NextResponse.json({ error: `Error llamando a Claude: ${e instanceof Error ? e.message : "unknown"}` }, { status: 502 })
  }

  const cleaned = stripJsonFence(raw)
  let ideas: Array<{ title: string; hook: string; format: string; notes: string }>
  try {
    ideas = JSON.parse(cleaned)
    if (!Array.isArray(ideas)) throw new Error("no array")
  } catch {
    return NextResponse.json({ error: "Claude devolvió una respuesta que no se pudo interpretar" }, { status: 502 })
  }

  const { data: inserted, error } = await supabase
    .from("content_ideas")
    .insert(ideas.map((i) => ({ client_id: ctx.clientId, channel, title: i.title, hook: i.hook, format: i.format, notes: i.notes })))
    .select("*")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: inserted })
}
