import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/auth/api-guards"
import { createServiceClient } from "@/lib/supabase-service"
import { buildOmniSystemPrompt, OmniContextError } from "@/lib/omni/system-prompt"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

type ChatMessage = { role: "user" | "assistant"; content: string }

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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY en el servidor" }, { status: 503 })

  const { message, conversationId } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: "message es obligatorio" }, { status: 400 })

  const supabase = createServiceClient()

  let systemPrompt: string
  try {
    systemPrompt = await buildOmniSystemPrompt(ctx.clientId)
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
      .eq("client_id", ctx.clientId)
      .maybeSingle()
    if (data) history = (data.messages as ChatMessage[]) ?? []
    else convoId = undefined
  }

  const messages: ChatMessage[] = [...history, { role: "user", content: message }]

  const anthropic = new Anthropic({ apiKey })
  let reply: string
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })
    const block = response.content.find((b) => b.type === "text")
    reply = block?.type === "text" ? block.text : ""
  } catch (e) {
    return NextResponse.json({ error: `Error llamando a Claude: ${e instanceof Error ? e.message : "unknown"}` }, { status: 502 })
  }

  const updatedMessages: ChatMessage[] = [...messages, { role: "assistant", content: reply }]

  if (convoId) {
    await supabase
      .from("chat_conversations")
      .update({ messages: updatedMessages })
      .eq("id", convoId)
      .eq("client_id", ctx.clientId)
  } else {
    const { data } = await supabase
      .from("chat_conversations")
      .insert({ client_id: ctx.clientId, user_id: ctx.user.id, messages: updatedMessages, title: message.slice(0, 60) })
      .select("id")
      .single()
    convoId = data?.id
  }

  return NextResponse.json({ reply, conversationId: convoId })
}
