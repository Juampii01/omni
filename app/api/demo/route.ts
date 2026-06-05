/**
 * POST /api/demo  (PÚBLICO — sin auth)
 *
 * Recibe el formulario de la landing y CREA UN LEAD en el módulo de Leads de Omni.
 * Usa el service role porque la RLS de `leads` exige usuario activo para INSERT,
 * y este endpoint es anónimo. source = "landing" para poder filtrarlos en el CRM.
 *
 * Debe estar allowlisteado en lib/supabase/middleware.ts (si no, el proxy lo
 * redirige a /login).
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/utils/ratelimit"

const BodySchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(120),
  email: z.string().trim().email("Email inválido").max(160),
  company: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().max(1000).optional().default(""),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit por IP (anti-spam): 5 envíos / minuto
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const rl = await checkRateLimit(`demo:${ip}`, 5, "60 s")
  if (!rl.success) {
    return NextResponse.json({ error: "Demasiados intentos. Probá en un minuto." }, { status: 429 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Datos inválidos"
    return NextResponse.json({ error: first }, { status: 400 })
  }
  const { name, email, company, message } = parsed.data

  try {
    const supabase = createServiceClient()
    const { error } = await (supabase as any).from("leads").insert({
      full_name: name,
      email,
      source: "landing",
      stage: "new",
      notes: message || null,
      metadata: {
        origin: "landing-demo",
        company: company || null,
        message: message || null,
        submitted_at: new Date().toISOString(),
        user_agent: req.headers.get("user-agent") ?? null,
      },
    })

    if (error) {
      console.error("[api/demo] insert lead failed:", error)
      return NextResponse.json({ error: "No pudimos registrar tu solicitud. Probá de nuevo." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[api/demo] threw:", e)
    return NextResponse.json({ error: "Error del servidor. Probá de nuevo." }, { status: 500 })
  }
}
