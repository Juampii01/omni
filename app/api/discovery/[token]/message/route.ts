import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createServiceClient } from "@/lib/supabase-service"
import { buildDiscoverySystemPrompt, type DiscoveryMessage } from "@/lib/omni/discovery"

export const maxDuration = 60

// Ruta pública — sin auth, el share_token ES la credencial. Bloqueada una
// vez que el prospecto ya envió sus respuestas (submitted_at seteado) para
// que un link reusado/filtrado no pueda seguir escribiendo después.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY en el servidor" }, { status: 503 })

  const { token } = await params
  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: "message es obligatorio" }, { status: 400 })

  const supabase = createServiceClient()
  const { data: session, error: fetchError } = await supabase
    .from("discovery_sessions")
    .select("id, prospect_name, niche, messages, submitted_at, prior_context")
    .eq("share_token", token)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: "Link inválido" }, { status: 404 })
  if (session.submitted_at) return NextResponse.json({ error: "Ya enviaste tus respuestas" }, { status: 400 })

  const history = (session.messages as DiscoveryMessage[]) ?? []
  const systemPrompt = buildDiscoverySystemPrompt({ prospectName: session.prospect_name, niche: session.niche, priorContext: session.prior_context })

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

  const { error: updateError } = await supabase
    .from("discovery_sessions")
    .update({ messages: updatedMessages, status: "in_progress" })
    .eq("share_token", token)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ reply })
}
