"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DonutSlice {
  label: string
  value: number
  color: string
}

interface Props {
  data:        DonutSlice[]
  height?:     number
  className?:  string
  formatValue?: (v: number) => string
  /** Inner label — shown in the center hole */
  centerLabel?: string
  centerValue?: string
  innerRadius?: number
  outerRadius?: number
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  formatValue,
}: TooltipProps<number, string> & { formatValue?: (v: number) => string }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg px-3 py-2.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.payload.color }} />
        <span className="font-medium text-foreground">{entry.name}:</span>
        <span className="text-muted-foreground">
          {formatValue ? formatValue(entry.value as number) : entry.value}
        </span>
      </div>
    </div>
  )
}

// ── Custom label ──────────────────────────────────────────────────────────────

function CustomLabel({
  cx,
  cy,
  centerLabel,
  centerValue,
}: {
  cx: number
  cy: number
  centerLabel?: string
  centerValue?: string
}) {
  if (!centerLabel && !centerValue) return null
  return (
    <g>
      {centerValue && (
        <text
          x={cx} y={cy - (centerLabel ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground"
          style={{ fontSize: 20, fontWeight: 700 }}
        >
          {centerValue}
        </text>
      )}
      {centerLabel && (
        <text
          x={cx} y={cy + (centerValue ? 16 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        >
          {centerLabel}
        </text>
      )}
    </g>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DonutChart({
  data,
  height = 240,
  className,
  formatValue,
  centerLabel,
  centerValue,
  innerRadius = 55,
  outerRadius = 85,
}: Props) {
  if (!data.length) return null

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            labelLine={false}
            label={(props) => (
              <CustomLabel
                cx={props.cx}
                cy={props.cy}
                centerLabel={centerLabel}
                centerValue={centerValue ?? total.toString()}
              />
            )}
          >
            {data.map((slice, i) => (
              <Cell
                key={i}
                fill={slice.color}
                stroke="transparent"
                fillOpacity={0.9}
              />
            ))}
          </Pie>
          <Tooltip
            content={<CustomTooltip formatValue={formatValue} />}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
