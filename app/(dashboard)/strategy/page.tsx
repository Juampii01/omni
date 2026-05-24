import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"
import { StrategyClient } from "./strategy-client"

export const metadata = { title: "Estrategia" }
export const dynamic = "force-dynamic"

export default async function StrategyPage() {
  await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  const [{ data: clients }, { data: strategies }] = await Promise.all([
    sb.from("clients").select("id, full_name, company, instagram_handle, tier").eq("status", "active").order("full_name"),
    sb.from("client_strategies")
      .select(`
        id, client_id, version, created_at,
        prospecting_angles, communication_angles, content_calendar,
        offer_structure, sales_approach, landing_page_copy, closing_angles,
        tokens_used
      `)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  return (
    <StrategyClient
      clients={(clients as any[]) ?? []}
      initialStrategies={(strategies as any[]) ?? []}
    />
  )
}
