import { requireRole } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { BrandingClient } from "./branding-client"

export const metadata = { title: "Branding — Omni" }

export default async function BrandingPage() {
  // Solo owner / admin pueden editar el branding
  await requireRole("owner", "admin")

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("client_settings")
    .select("id, business_name, brand_color, brand_accent_color, business_logo_url, timezone, currency, fiscal_year_start")

  // client_settings es singleton — tomamos la primera fila
  const row = Array.isArray(data) ? (data[0] ?? null) : (data ?? null)

  return <BrandingClient initialSettings={row} />
}
