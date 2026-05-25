"use client"

import { useMemo, useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { BarChart2, DollarSign, TrendingUp, Users, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdAccount {
  id: string
  meta_account_id: string
  account_name: string
  currency: string
  last_synced_at: string | null
}

interface Insight {
  date: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  reach: number
  conversions: number
  roas: number
  cpl: number
  campaign_id: string
}

interface Campaign {
  campaign_id: string
  name: string
  objective: string
  status: string
  daily_budget: number | null
  lifetime_budget: number | null
}

interface AdsClientProps {
  account: AdAccount
  insights: Insight[]
  campaigns: Campaign[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
const fmtUSD = (n: number) => fmt.format(n)
const fmtPct = (n: number) => `${n.toFixed(2)}%`
const fmtNum = (n: number) => n.toLocaleString("es-AR")

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
}

function fmtSyncDate(iso: string | null): string {
  if (!iso) return "Nunca"
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  })
}

const TOOLTIP_STYLE = {
  backgroundColor: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "8px",
  fontSize: "12px",
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AdsClient({ account, insights, campaigns }: AdsClientProps) {
  const [syncing, setSyncing] = useState(false)

  // KPIs — agregación total del período
  const kpis = useMemo(() => {
    const totalSpend = insights.reduce((s, r) => s + r.spend, 0)
    const totalConversions = insights.reduce((s, r) => s + r.conversions, 0)

    // CPL promedio ponderado por conversiones
    const weightedCpl = totalConversions > 0 ? totalSpend / totalConversions : 0

    // ROAS promedio: suma de roas ponderado por spend
    const weightedRoas = totalSpend > 0
      ? insights.reduce((s, r) => s + r.roas * r.spend, 0) / totalSpend
      : 0

    return { totalSpend, totalConversions, weightedCpl, weightedRoas }
  }, [insights])

  // Datos para el gráfico de gasto diario
  const chartData = useMemo(() => {
    const byDate: Record<string, number> = {}
    for (const r of insights) {
      byDate[r.date] = (byDate[r.date] ?? 0) + r.spend
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, spend]) => ({ label: fmtDate(date), spend }))
  }, [insights])

  // Campañas con métricas agregadas
  const campaignStats = useMemo(() => {
    return campaigns.map(c => {
      const rows = insights.filter(r => r.campaign_id === c.campaign_id)
      const spend = rows.reduce((s, r) => s + r.spend, 0)
      const impressions = rows.reduce((s, r) => s + r.impressions, 0)
      const clicks = rows.reduce((s, r) => s + r.clicks, 0)
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
      const cpc = clicks > 0 ? spend / clicks : 0
      return { ...c, spend, impressions, clicks, ctr, cpc }
    }).sort((a, b) => b.spend - a.spend)
  }, [campaigns, insights])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/meta-ads/sync", { method: "POST" })
      const data = await res.json() as { ok?: boolean; campaigns?: number; insights?: number; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error al sincronizar")
      toast.success(`Sincronizado: ${data.campaigns} campañas, ${data.insights} registros. Recargá para ver los datos.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al sincronizar")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meta Ads"
        description={`${account.account_name} · Últimos 30 días · Sync: ${fmtSyncDate(account.last_synced_at)}`}
        icon={BarChart2}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sincronizar
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Gasto total"
          value={fmtUSD(kpis.totalSpend)}
          sub="últimos 30 días"
          icon={DollarSign}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <KpiCard
          label="CPL promedio"
          value={kpis.weightedCpl > 0 ? fmtUSD(kpis.weightedCpl) : "—"}
          sub="costo por lead/compra"
          icon={Users}
          color="bg-blue-500/10 text-blue-400"
        />
        <KpiCard
          label="ROAS promedio"
          value={kpis.weightedRoas > 0 ? `${kpis.weightedRoas.toFixed(2)}x` : "—"}
          sub="retorno sobre inversión"
          icon={TrendingUp}
          color="bg-violet-500/10 text-violet-400"
        />
        <KpiCard
          label="Conversiones"
          value={fmtNum(kpis.totalConversions)}
          sub="leads + compras"
          icon={BarChart2}
          color="bg-orange-500/10 text-orange-400"
        />
      </div>

      {/* Gráfico de gasto diario */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Gasto diario — últimos 30 días</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              Sin datos de gasto. Sincronizá para cargar métricas.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: "#e5e5e5" }}
                  formatter={(val: number) => [fmtUSD(val), "Gasto"]}
                />
                <Line
                  type="monotone"
                  dataKey="spend"
                  name="Gasto"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#22c55e" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabla de campañas */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Campañas activas y pausadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {campaignStats.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Sin campañas. Sincronizá para cargar datos.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground font-medium pl-4">Campaña</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Estado</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Gasto</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Impresiones</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">CTR</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right pr-4">CPC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignStats.map(c => (
                  <TableRow key={c.campaign_id} className="border-border hover:bg-muted/30">
                    <TableCell className="pl-4">
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.objective}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded-full",
                        c.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-yellow-500/10 text-yellow-500"
                      )}>
                        {c.status === "ACTIVE" ? "Activa" : "Pausada"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {c.spend > 0 ? fmtUSD(c.spend) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {c.impressions > 0 ? fmtNum(c.impressions) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {c.ctr > 0 ? fmtPct(c.ctr) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums pr-4 text-muted-foreground">
                      {c.cpc > 0 ? fmtUSD(c.cpc) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
