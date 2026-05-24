import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/auth/get-user"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try { user = await requireAuth() } catch {
    return new Response("No autorizado", { status: 401 })
  }

  const { clientId } = await req.json()
  if (!clientId) return NextResponse.json({ error: "clientId requerido" }, { status: 400 })

  const supabase = await createClient()
  const sb = supabase as any

  // Credits check
  const { data: settings } = await sb.from("client_settings").select("ai_credits_used, ai_credits_limit, business_name").single()
  if ((settings?.ai_credits_used ?? 0) >= (settings?.ai_credits_limit ?? 100_000)) {
    return NextResponse.json({ error: "credits_exceeded" }, { status: 429 })
  }

  // Load client data
  const { data: client, error: cErr } = await sb
    .from("clients")
    .select("full_name, company, instagram_handle, tier, monthly_fee, currency, notes, tags")
    .eq("id", clientId)
    .single()

  if (cErr || !client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

  const agencyName = settings?.business_name ?? "la agencia"

  const prompt = `Sos un estratega senior de agencias de marketing y coaching de alto ticket. Generá el CoachMap completo para este cliente.

AGENCIA: ${agencyName}
CLIENTE:
- Nombre: ${client.full_name}
- Empresa: ${client.company ?? "no especificada"}
- Instagram: ${client.instagram_handle ? `@${client.instagram_handle}` : "no especificado"}
- Tier: ${client.tier}
- Fee mensual: ${client.monthly_fee ? `${client.currency} ${client.monthly_fee}` : "no especificado"}
- Tags: ${(client.tags ?? []).join(", ") || "ninguno"}
- Notas: ${client.notes ?? "ninguna"}

Respondé con un JSON válido con EXACTAMENTE esta estructura (sin markdown, solo el objeto JSON puro):
{
  "prospecting_angles": "texto detallado (3-5 ángulos de prospección para conseguir clientes similares a este)",
  "communication_angles": "texto detallado (3-5 ángulos de comunicación para resonar con este cliente y similares)",
  "content_calendar": {
    "weekly_structure": "descripción de la estructura semanal de contenido",
    "content_pillars": ["pilar 1", "pilar 2", "pilar 3", "pilar 4"],
    "monthly_themes": ["tema mes 1", "tema mes 2", "tema mes 3"]
  },
  "offer_structure": "descripción detallada de cómo estructurar la oferta para este cliente (tiers, bonos, garantías)",
  "sales_approach": "guía de approach de ventas: cómo abrir, calificar, presentar y cerrar con este tipo de cliente",
  "landing_page_copy": "copy completo para landing page: headline, subheadline, bullets de beneficios, CTA, objeciones",
  "closing_angles": "3-5 ángulos de cierre específicos para este perfil de cliente con el manejo de objeciones típicas"
}`

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    })

    const rawText = response.content[0].type === "text" ? response.content[0].text : ""
    const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    // Parse JSON
    let parsed: Record<string, unknown>
    try {
      // Strip possible ```json ... ``` wrapper
      const clean = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim()
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON", raw: rawText }, { status: 500 })
    }

    // Save to client_strategies
    const svc = await createServiceClient() as any

    // Get current max version for this client
    const { data: existing } = await svc
      .from("client_strategies")
      .select("version")
      .eq("client_id", clientId)
      .order("version", { ascending: false })
      .limit(1)
      .single()

    const version = (existing?.version ?? 0) + 1

    const { data: strategy, error: sErr } = await svc
      .from("client_strategies")
      .insert({
        client_id: clientId,
        version,
        prospecting_angles: parsed.prospecting_angles,
        communication_angles: parsed.communication_angles,
        content_calendar: parsed.content_calendar,
        offer_structure: parsed.offer_structure,
        sales_approach: parsed.sales_approach,
        landing_page_copy: parsed.landing_page_copy,
        closing_angles: parsed.closing_angles,
        model: "claude-opus-4-5",
        tokens_used: tokensUsed,
        generated_by: user.id,
      })
      .select()
      .single()

    if (sErr) throw sErr

    // Update credits
    const { data: cs } = await svc.from("client_settings").select("ai_credits_used").single()
    await svc.from("client_settings").update({ ai_credits_used: (cs?.ai_credits_used ?? 0) + tokensUsed })

    return NextResponse.json({ strategy, tokens_used: tokensUsed })
  } catch (err) {
    console.error("[strategy/generate]", err)
    return NextResponse.json({ error: "Error generando estrategia" }, { status: 500 })
  }
}
