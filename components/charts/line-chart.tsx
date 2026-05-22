"use client"

import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LineSeries {
  key:   string
  label: string
  color: string
}

interface Props {
  data:        Record<string, unknown>[]
  series:      LineSeries[]
  xKey:        string
  xLabel?:     string
  yLabel?:     string
  height?:     number
  className?:  string
  formatY?:    (v: number) => string
  formatX?:    (v: string) => string
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  series,
  formatY,
}: TooltipProps<number, string> & { series: LineSeries[]; formatY?: (v: number) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg px-3 py-2.5 text-xs space-y-1.5">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map(entry => {
        const s = series.find(s => s.key === entry.dataKey)
        return (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{s?.label ?? entry.dataKey}:</span>
            <span className="font-medium text-foreground">
              {formatY ? formatY(entry.value as number) : entry.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LineChart({
  data,
  series,
  xKey,
  height = 280,
  className,
  formatY,
  formatX,
}: Props) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ReLineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey={xKey}
            tickFormatter={formatX}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tickFormatter={formatY}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            dx={-4}
            width={48}
          />
          <Tooltip
            content={<CustomTooltip series={series} formatY={formatY} />}
            cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
          />
          {series.length > 1 && (
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          )}
          {series.map(s => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ))}
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}
