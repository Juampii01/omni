import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { KpisClient } from "./kpis-client"

export const metadata = { title: "KPIs" }

export default async function KpisPage() {
  await requireAuth()
  const supabase = await createClient()

  const [{ data: kpisData }, { data: depsData }] = await Promise.all([
    supabase
      .from("kpis")
      .select("*")
      .order("period_month", { ascending: false })
      .order("category")
      .order("metric_name"),
    supabase
      .from("departments")
      .select("id, name, color")
      .order("name"),
  ])

  return (
    <KpisClient
      initialKpis={(kpisData as any[]) ?? []}
      departments={(depsData as any[]) ?? []}
    />
  )
}
