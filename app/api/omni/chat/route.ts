import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth, getJwt } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { buildOmniSystemPrompt, OmniContextError } from "@/lib/omni/system-prompt"
import { CHAT_TOOLS, runChatTool } from "@/lib/omni/chat-tools"
import { checkRateLimit } from "@/lib/omni/rate-limit"

// Loop de tool-use puede implicar varias llamadas secuenciales a Claude en
// un solo request — el default de Vercel no alcanza.
export const maxDuration = 60

type ChatMessage = { role: "user" | "assistant"; content: string }

const MAX_TOOL_TURNS = 5

const TOOL_USE_ADDENDUM = `

## Herramientas de datos en vivo

Tenés acceso a herramientas de solo lectura que consultan los datos reales
de este negocio (leads, contenido, tareas, calendario, briefings, check-ins
de equipo). Usalas cuando la pregunta requiera números o hechos concretos y
actuales — nunca los inventes ni los estimes a partir del contexto general.
Si la pregunta no requiere datos en vivo, respondé directamente sin llamar
a ninguna herramienta.`

export async function GET(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, title, messages, updated_at")
    .eq("client_id", ctx.clientId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversation: data ?? null })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const clientId = ctx.clientId

  if (!(await checkRateLimit(clientId, "chat", { maxCalls: 20, windowSeconds: 60 }))) {
    return NextResponse.json({ error: "Demasiadas solicitudes, esperá un momento y volvé a intentar." }, { status: 429 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY en el servidor" }, { status: 503 })

  const { message, conversationId } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: "message es obligatorio" }, { status: 400 })

  const supabase = createServiceClient()

  let systemPrompt: string
  try {
    systemPrompt = await buildOmniSystemPrompt(clientId)
  } catch (e) {
    const msg = e instanceof OmniContextError ? e.message : "Error armando el contexto de Omni"
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  let history: ChatMessage[] = []
  let convoId = conversationId as string | undefined

  if (convoId) {
    const { data } = await supabase
      .from("chat_conversations")
      .select("id, messages, client_id")
      .eq("id", convoId)
      .eq("client_id", clientId)
      .maybeSingle()
    if (data) history = (data.messages as ChatMessage[]) ?? []
    else convoId = undefined
  }

  const anthropic = new Anthropic({ apiKey })

  // Loop de tool-use: efímero — solo el mensaje final del usuario y la
  // respuesta final de texto se persisten (mismo shape de siempre en
  // chat_conversations.messages). El intercambio de tool_use/tool_result
  // intermedio vive solo en esta variable local y se descarta al terminar
  // el request — las herramientas de analytics deben re-consultar datos en
  // vivo en cada turno de todos modos.
  const apiMessages: Anthropic.MessageParam[] = [
    ...history.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ]

  let reply: string
  try {
    let turn = 0
    for (;;) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system: [{ type: "text", text: systemPrompt + TOOL_USE_ADDENDUM, cache_control: { type: "ephemeral" } }],
        tools: CHAT_TOOLS,
        messages: apiMessages,
      })

      if (response.stop_reason !== "tool_use" || turn >= MAX_TOOL_TURNS) {
        const block = response.content.find((b) => b.type === "text")
        reply =
          block?.type === "text" && block.text
            ? block.text
            : "No pude terminar de procesar tu pregunta con las herramientas disponibles — probá reformularla de forma más simple."
        break
      }

      apiMessages.push({ role: "assistant", content: response.content })

      const toolUses = response.content.filter((b) => b.type === "tool_use")
      const toolResults = await Promise.all(
        toolUses.map(async (toolUse): Promise<Anthropic.ToolResultBlockParam> => {
          try {
            const result = await runChatTool(clientId, toolUse.name, (toolUse.input as Record<string, unknown>) ?? {})
            return { type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) }
          } catch (e) {
            return {
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: e instanceof Error ? e.message : "Error desconocido",
              is_error: true,
            }
          }
        })
      )
      apiMessages.push({ role: "user", content: toolResults })

      turn += 1
    }
  } catch (e) {
    return NextResponse.json({ error: `Error llamando a Claude: ${e instanceof Error ? e.message : "unknown"}` }, { status: 502 })
  }

  const updatedMessages: ChatMessage[] = [...history, { role: "user", content: message }, { role: "assistant", content: reply }]

  if (convoId) {
    await supabase.from("chat_conversations").update({ messages: updatedMessages }).eq("id", convoId).eq("client_id", clientId)
  } else {
    const { data } = await supabase
      .from("chat_conversations")
      .insert({ client_id: clientId, user_id: ctx.user.id, messages: updatedMessages, title: message.slice(0, 60) })
      .select("id")
      .single()
    convoId = data?.id
  }

  return NextResponse.json({ reply, conversationId: convoId })
}
