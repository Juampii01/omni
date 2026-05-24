import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { MetricsClient } from "./metrics-client"

export const metadata = { title: "Métricas" }
export const dynamic = "force-dynamic"

export default async function MetricsPage() {
  await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  // Last 12 calendar months
  const since = new Date()
  since.setMonth(since.getMonth() - 11)
  since.setDate(1)
  const sinceStr = since.toISOString().split("T")[0]

  const [
    { data: revenue },
    { data: expenses },
    { data: kpis },
  ] = await Promise.all([
    sb.from("revenue_records")
      .select("period_month, category, amount, currency, description, client_id")
      .gte("period_month", sinceStr)
      .order("period_month", { ascending: false }),
    sb.from("expense_records")
      .select("period_month, category, amount, currency, description")
      .gte("period_month", sinceStr)
      .order("period_month", { ascending: false }),
    sb.from("kpis")
      .select("period_month, metric_name, metric_value, metric_target, unit")
      .gte("period_month", sinceStr)
      .order("period_month", { ascending: false }),
  ])

  return (
    <MetricsClient
      revenue={(revenue as any[]) ?? []}
      expenses={(expenses as any[]) ?? []}
      kpis={(kpis as any[]) ?? []}
    />
  )
}
