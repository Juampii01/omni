import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { AdsClient } from "./ads-client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart2 } from "lucide-react"

export const metadata = { title: "Meta Ads — Métricas" }
export const dynamic = "force-dynamic"

export default async function AdsMetricsPage() {
  await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  // Buscar cuenta activa
  const { data: account } = await sb
    .from("meta_ads_accounts")
    .select("id, meta_account_id, account_name, currency, last_synced_at")
    .eq("is_active", true)
    .maybeSingle()

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <BarChart2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Sin cuenta Meta Ads conectada</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Conectá tu cuenta publicitaria para ver gasto, CPL, ROAS y campañas activas.
          </p>
        </div>
        <Button asChild className="bg-brand hover:bg-brand/90">
          <Link href="/settings/integrations">Conectar Meta Ads</Link>
        </Button>
      </div>
    )
  }

  // Últimos 30 días
  const until = new Date()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sinceStr = since.toISOString().split("T")[0]
  const untilStr = until.toISOString().split("T")[0]

  const [
    { data: insights },
    { data: campaigns },
  ] = await Promise.all([
    sb
      .from("meta_ads_insights")
      .select("date,spend,impressions,clicks,ctr,cpc,cpm,reach,conversions,roas,cpl,campaign_id")
      .eq("meta_account_id", account.meta_account_id)
      .gte("date", sinceStr)
      .lte("date", untilStr)
      .order("date", { ascending: true }),
    sb
      .from("meta_ads_campaigns")
      .select("campaign_id,name,objective,status,daily_budget,lifetime_budget")
      .eq("meta_account_id", account.meta_account_id)
      .in("status", ["ACTIVE", "PAUSED"]),
  ])

  return (
    <AdsClient
      account={account}
      insights={(insights as any[]) ?? []}
      campaigns={(campaigns as any[]) ?? []}
    />
  )
}
