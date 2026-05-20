import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return new Response("No autorizado", { status: 401 })
  }

  const { messages, conversationId } = await req.json()

  if (!messages || !Array.isArray(messages)) {
    return new Response("Mensajes inválidos", { status: 400 })
  }

  // Fetch business context
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from("client_settings")
    .select("business_name, currency, timezone")
    .single()
  const bizName = (settings as any)?.business_name ?? "la empresa"

  const systemPrompt = `Sos el asistente de IA de ${bizName}, integrado en Omni — su sistema operativo de negocios.

Tu función es ayudar al equipo con:
- Análisis de datos de ventas, KPIs y métricas
- Redacción de emails, propuestas y contenido
- Estrategia comercial y operativa
- Respuesta a consultas sobre el negocio

Respondé siempre en español rioplatense (Argentina). Sé conciso, directo y accionable.
Fecha actual: ${new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    system: systemPrompt,
    messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = ""
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            fullText += chunk.delta.text
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        // Save to DB if conversationId provided
        if (conversationId && fullText) {
          const sb = supabase as any
          await sb.from("ai_messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: fullText,
          })
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  })
}
