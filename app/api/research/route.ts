import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/auth/get-user"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── POST /api/research — submit + stream AI research ─────────────────────────
export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try { user = await requireAuth() } catch {
    return new Response("No autorizado", { status: 401 })
  }

  const { title, prompt } = await req.json()
  if (!title?.trim() || !prompt?.trim()) {
    return NextResponse.json({ error: "Título y prompt requeridos" }, { status: 400 })
  }

  const supabase = await createClient()
  const sb = supabase as any

  // Credits check
  const { data: settings } = await sb.from("client_settings").select("ai_credits_used, ai_credits_limit").single()
  if ((settings?.ai_credits_used ?? 0) >= (settings?.ai_credits_limit ?? 100_000)) {
    return NextResponse.json({ error: "credits_exceeded" }, { status: 429 })
  }

  // Create pending research request
  const { data: request, error: rErr } = await sb
    .from("research_requests")
    .insert({
      title: title.trim(),
      prompt: prompt.trim(),
      status: "processing",
      requested_by: user.id,
    })
    .select("id")
    .single()

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  const requestId: string = request.id

  const systemPrompt = `Sos un analista estratégico senior especializado en negocios digitales, agencias de marketing y coaches/consultores de alto ticket. Respondés con análisis profundos, accionables y fundamentados.

Formato de respuesta:
- Usá **negrita** para puntos clave
- Usá ## para secciones principales
- Usá listas con - cuando haya múltiples items
- Cerrá siempre con una sección ## Próximos pasos con 3-5 acciones concretas
- Respondé en español rioplatense (vos, tenes, podes)
- Sé directo, sin relleno, con datos y ejemplos específicos cuando sea posible

Fecha: ${new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`

  const encoder = new TextEncoder()
  let accumulated = ""
  let inputTokens = 0
  let outputTokens = 0

  const readable = new ReadableStream({
    async start(controller) {
      // Send request ID first so client can track it
      controller.enqueue(encoder.encode(`__ID__${requestId}__\n`))

      try {
        const stream = anthropic.messages.stream({
          model: "claude-opus-4-5",
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt.trim() }],
        })

        for await (const chunk of stream) {
          if (chunk.type === "message_start") {
            inputTokens = chunk.message.usage?.input_tokens ?? 0
          }
          if (chunk.type === "message_delta" && (chunk as any).usage) {
            outputTokens = (chunk as any).usage.output_tokens ?? 0
          }
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            accumulated += chunk.delta.text
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        console.error("[research] stream error:", err)
        controller.error(err)
      } finally {
        controller.close()

        const tokensUsed = inputTokens + outputTokens

        // Save result (service client bypasses RLS)
        try {
          const svc = await createServiceClient() as any
          await svc.from("research_requests").update({
            status: accumulated ? "done" : "failed",
            result_markdown: accumulated || null,
            model: "claude-opus-4-5",
            tokens_used: tokensUsed,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", requestId)

          if (tokensUsed > 0) {
            const { data: cs } = await svc.from("client_settings").select("ai_credits_used").single()
            await svc.from("client_settings").update({ ai_credits_used: (cs?.ai_credits_used ?? 0) + tokensUsed })
          }
        } catch (saveErr) {
          console.error("[research] save error:", saveErr)
        }
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Research-Id": requestId,
      "Access-Control-Expose-Headers": "X-Research-Id",
    },
  })
}

// ── GET /api/research — list past requests ────────────────────────────────────
export async function GET() {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from("research_requests")
    .select("id, title, prompt, status, result_markdown, tokens_used, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data })
}
