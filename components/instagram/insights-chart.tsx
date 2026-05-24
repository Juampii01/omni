"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

interface DailyInsight {
  period_date: string
  followers_count?: number
  reach?: number
  impressions?: number
  profile_views?: number
}

interface Props {
  insights: DailyInsight[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
}

export function IGInsightsChart({ insights }: Props) {
  if (insights.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Sin datos de insights. El cron sincronizará en las próximas 6 horas.
        </CardContent>
      </Card>
    )
  }

  const data = insights.map((d) => ({
    date: formatDate(d.period_date),
    Seguidores: d.followers_count ?? 0,
    Alcance: d.reach ?? 0,
    Impresiones: d.impressions ?? 0,
    "Visitas perfil": d.profile_views ?? 0,
  }))

  const tooltipStyle = {
    backgroundColor: "#111111",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    fontSize: "12px",
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Métricas últimos 30 días</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradImp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
            />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e5e5e5" }} />
            <Area
              type="monotone"
              dataKey="Alcance"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#gradReach)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="Impresiones"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#gradImp)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
