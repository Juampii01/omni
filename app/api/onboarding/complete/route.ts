import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"

export interface OnboardingPayload {
  businessName: string
  industry:     string
  teamSize:     string
  currency:     string
  brandColor:   string
  teamEmails:   string[]
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let payload: OnboardingPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const { businessName, industry, teamSize, currency, brandColor, teamEmails } = payload

  if (!businessName?.trim()) {
    return NextResponse.json({ error: "Nombre del negocio requerido" }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("client_settings")
    .update({
      business_name:        businessName.trim(),
      currency:             currency ?? "USD",
      brand_color:          brandColor ?? "#236461",
      brand_accent_color:   brandColor ?? "#236461",
      onboarding_completed: true,
    })

  if (error) {
    console.error("[onboarding/complete] Supabase error:", error)
    return NextResponse.json({ error: "Error al guardar los datos" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
