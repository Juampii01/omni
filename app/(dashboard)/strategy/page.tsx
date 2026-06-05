import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"
import { StrategyClient } from "./strategy-client"

export const metadata = { title: "Estrategia" }
export const dynamic = "force-dynamic"

export default async function StrategyPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  const { data: strategy } = await sb
    .from("business_strategy")
    .select("*")
    .eq("singleton", true)
    .single()

  const canEdit = ["owner", "admin", "manager"].includes(user.role)

  return <StrategyClient initial={(strategy as any) ?? null} canEdit={canEdit} />
}
