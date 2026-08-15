/**
 * POST /api/demo  (PÚBLICO — sin auth)
 *
 * Recibe el formulario de la landing pública de Omni y guarda un "demo request"
 * (prospecto de KAVAR/Omni). No es un lead de un cliente/tenant — por eso vive
 * en su propia tabla `demo_requests`, no en `leads` (que es multi-tenant).
 *
 * Usa el service role porque el endpoint es anónimo. Rate-limit simple por IP.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-service"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clip(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : ""
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const name = clip(body.name, 120)
  const email = clip(body.email, 160)
  const company = clip(body.company, 160)
  const message = clip(body.message, 1000)

  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Email inválido" }, { status: 400 })

  const supabase = createServiceClient()

  // Rate-limit por IP: máx 5 envíos / minuto
  const since = new Date(Date.now() - 60_000).toISOString()
  const { count } = await supabase
    .from("demo_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since)
  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Demasiados intentos. Probá en un minuto." }, { status: 429 })
  }

  const { error } = await supabase.from("demo_requests").insert({
    full_name: name,
    email,
    company: company || null,
    message: message || null,
    source: "landing",
    ip,
    user_agent: req.headers.get("user-agent") ?? null,
  })

  if (error) {
    console.error("[api/demo] insert failed:", error)
    return NextResponse.json({ error: "No pudimos registrar tu solicitud. Probá de nuevo." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
