"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AreaChart } from "@/components/charts/area-chart"
import { BarChart } from "@/components/charts/bar-chart"
import { DonutChart, type DonutSlice } from "@/components/charts/donut-chart"
import { TrendingUp, BarChart2, PieChart } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type Kpi = {
  id:            string
  period_month:  string
  category:      string
  metric_name:   string
  metric_value:  number | null
  metric_target: number | null
  unit:          string | null
}

interface Props {
  kpis: Kpi[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SERIES_COLORS = [
  "#236461", "#6366f1", "#0ea5e9", "#10b981",
  "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444",
]

function fmt(value: number | null, unit: string | null): string {
  if (value == null) return "—"
  const u = (unit ?? "").toLowerCase().trim()
  if (u === "usd" || u === "$") return `$${value.toLocaleString("en-US")}`
  if (u === "percent" || u === "%") return `${value}%`
  return value.toLocaleString("es-AR")
}

function shortMonth(dateStr: string): string {
  if (!dateStr) return ""
  const [y, m] = dateStr.split("-")
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleString("es-AR", { month: "short", year: "2-digit" })
}

function derivedStatus(value: number | null, target: number | null) {
  if (value == null || target == null || target === 0) return null
  const pct = (value / target) * 100
  if (pct >= 100) return "on_track"
  if (pct >= 70)  return "at_risk"
  return "behind"
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KpiChartsView({ kpis }: Props) {
  // ── 1. All unique metric names that have at least 2 data points ─────────────
  const metricNames = useMemo(() => {
    const counts: Record<string, number> = {}
    kpis.forEach(k => {
      if (k.metric_value != null) counts[k.metric_name] = (counts[k.metric_name] ?? 0) + 1
    })
    return Object.entries(counts)
      .filter(([, c]) => c >= 2)
      .map(([name]) => name)
      .sort()
  }, [kpis])

  // ── 2. All sorted months ────────────────────────────────────────────────────
  const months = useMemo(
    () => Array.from(new Set(kpis.map(k => k.period_month))).sort(),
    [kpis],
  )

  // ── 3. Latest month ─────────────────────────────────────────────────────────
  const latestMonth = months[months.length - 1] ?? null

  // ── 4. Selected metrics for evolution chart (max 5) ─────────────────────────
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(() =>
    metricNames.slice(0, Math.min(3, metricNames.length))
  )

  // ── 5. Build evolution data (AreaChart) ─────────────────────────────────────
  const evolutionData = useMemo(() => {
    return months.map(month => {
      const row: Record<string, unknown> = { month: shortMonth(month) }
      selectedMetrics.forEach(name => {
        const kpi = kpis.find(k => k.period_month === month && k.metric_name === name)
        row[name] = kpi?.metric_value ?? null
      })
      return row
    })
  }, [months, kpis, selectedMetrics])

  const evolutionSeries = selectedMetrics.map((name, i) => ({
    key:   name,
    label: name,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
  }))

  // ── 6. Build valor vs meta data (BarChart) — latest month ───────────────────
  const latestKpis = useMemo(() => {
    if (!latestMonth) return []
    return kpis
      .filter(k => k.period_month === latestMonth && k.metric_value != null)
      .slice(0, 10)
  }, [kpis, latestMonth])

  const barData = latestKpis.map(k => ({
    name:   k.metric_name.length > 20 ? k.metric_name.slice(0, 18) + "…" : k.metric_name,
    Valor:  k.metric_value ?? 0,
    Meta:   k.metric_target ?? 0,
  }))

  const barSeries = [
    { key: "Valor", label: "Valor actual", color: "#236461" },
    { key: "Meta",  label: "Objetivo",     color: "#94a3b8" },
  ]

  // ── 7. Build donut — status distribution ────────────────────────────────────
  const donutData = useMemo<DonutSlice[]>(() => {
    const allLatest = kpis.filter(k => k.period_month === latestMonth)
    const onTrack = allLatest.filter(k => derivedStatus(k.metric_value, k.metric_target) === "on_track").length
    const atRisk  = allLatest.filter(k => derivedStatus(k.metric_value, k.metric_target) === "at_risk").length
    const behind  = allLatest.filter(k => derivedStatus(k.metric_value, k.metric_target) === "behind").length
    const noTarget = allLatest.filter(k => k.metric_target == null || k.metric_target === 0).length

    return [
      onTrack  > 0 && { label: "En meta",    value: onTrack,  color: "#22c55e" },
      atRisk   > 0 && { label: "En riesgo",  value: atRisk,   color: "#f59e0b" },
      behind   > 0 && { label: "Atrasado",   value: behind,   color: "#ef4444" },
      noTarget > 0 && { label: "Sin meta",   value: noTarget, color: "#94a3b8" },
    ].filter(Boolean) as DonutSlice[]
  }, [kpis, latestMonth])

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (kpis.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <BarChart2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">Sin datos para graficar</p>
          <p className="text-xs text-muted-foreground">Agrega KPIs para ver las visualizaciones</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Row 1: AreaChart + DonutChart ────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Evolution (2/3 width) */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand" />
              <CardTitle className="text-sm font-semibold">Evolucion por metrica</CardTitle>
            </div>
            {metricNames.length > 0 && (
              <Select
                value={selectedMetrics[0] ?? ""}
                onValueChange={v => setSelectedMetrics([v, ...selectedMetrics.slice(1, 3)])}
              >
                <SelectTrigger className="h-7 w-44 text-xs">
                  <SelectValue placeholder="Elegir metrica" />
                </SelectTrigger>
                <SelectContent>
                  {metricNames.map(name => (
                    <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {metricNames.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Se necesitan al menos 2 periodos con datos
              </div>
            ) : (
              <AreaChart
                data={evolutionData}
                series={evolutionSeries}
                xKey="month"
                height={220}
                formatY={v => v.toLocaleString("es-AR")}
              />
            )}
          </CardContent>
        </Card>

        {/* Donut (1/3 width) */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-brand" />
              <CardTitle className="text-sm font-semibold">Estado KPIs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {donutData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Sin metas configuradas
              </div>
            ) : (
              <DonutChart
                data={donutData}
                height={200}
                centerLabel="metricas"
                centerValue={String(donutData.reduce((s, d) => s + d.value, 0))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: BarChart valor vs meta ────────────────────────────────────── */}
      {barData.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-brand" />
              <CardTitle className="text-sm font-semibold">
                Valor vs Meta — {latestMonth ? shortMonth(latestMonth) : ""}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <BarChart
              data={barData}
              series={barSeries}
              xKey="name"
              height={240}
              formatY={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
