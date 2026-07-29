import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requirePlatformAdmin, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { buildDiscoverySystemPrompt, type DiscoveryMessage } from "@/lib/omni/discovery"

export const maxDuration = 60

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePlatformAdmin(getJwt(req))
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY en el servidor" }, { status: 503 })

  const { id } = await params
  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: "message es obligatorio" }, { status: 400 })

  const supabase = createServiceClient()
  const { data: session, error: fetchError } = await supabase
    .from("discovery_sessions")
    .select("id, prospect_name, niche, status, messages")
    .eq("id", id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  if (session.status === "archived") {
    return NextResponse.json({ error: "Esta sesión está archivada" }, { status: 400 })
  }

  const history = (session.messages as DiscoveryMessage[]) ?? []
  const systemPrompt = buildDiscoverySystemPrompt({ prospectName: session.prospect_name, niche: session.niche })

  const anthropic = new Anthropic({ apiKey })
  let reply: string
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [...history.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })), { role: "user", content: message }],
    })
    const block = response.content.find((b) => b.type === "text")
    reply = block?.type === "text" && block.text ? block.text : "No entendí bien eso — ¿podés reformularlo?"
  } catch (e) {
    return NextResponse.json({ error: `Error llamando a Claude: ${e instanceof Error ? e.message : "unknown"}` }, { status: 502 })
  }

  const updatedMessages: DiscoveryMessage[] = [...history, { role: "user", content: message }, { role: "assistant", content: reply }]

  // Si la sesión ya estaba completa y se sigue hablando, vuelve a in_progress
  // — el summary viejo queda hasta que se pida un "Finalizar" nuevo, para no
  // perderlo si algo falla a mitad de la conversación reabierta.
  const { error: updateError } = await supabase
    .from("discovery_sessions")
    .update({ messages: updatedMessages, status: "in_progress" })
    .eq("id", id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ reply })
}
