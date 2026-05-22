"use client"

import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BarSeries {
  key:    string
  label:  string
  color:  string
}

interface Props {
  data:        Record<string, unknown>[]
  series:      BarSeries[]
  xKey:        string
  height?:     number
  className?:  string
  formatY?:    (v: number) => string
  formatX?:    (v: string) => string
  /** When true, each bar in a single series gets its own color from series[0].color tinted */
  colorByCell?: boolean
  layout?:     "horizontal" | "vertical"
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  series,
  formatY,
}: TooltipProps<number, string> & { series: BarSeries[]; formatY?: (v: number) => string }) {
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

// ── Bar cell colors ───────────────────────────────────────────────────────────

const CELL_COLORS = [
  "#236461", "#6366f1", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
]

// ── Component ─────────────────────────────────────────────────────────────────

export function BarChart({
  data,
  series,
  xKey,
  height = 280,
  className,
  formatY,
  formatX,
  colorByCell = false,
  layout = "horizontal",
}: Props) {
  const isVertical = layout === "vertical"

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ReBarChart
          data={data}
          layout={isVertical ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={!isVertical} vertical={isVertical} />
          {isVertical ? (
            <>
              <XAxis
                type="number"
                tickFormatter={formatY}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                tickFormatter={formatX}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
            </>
          ) : (
            <>
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
            </>
          )}
          <Tooltip
            content={<CustomTooltip series={series} formatY={formatY} />}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
          />
          {series.length > 1 && (
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          )}
          {series.map((s, si) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              radius={[3, 3, 0, 0]}
              maxBarSize={isVertical ? 20 : 40}
            >
              {colorByCell && series.length === 1 &&
                data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CELL_COLORS[i % CELL_COLORS.length]}
                    fillOpacity={0.85}
                  />
                ))
              }
            </Bar>
          ))}
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}
