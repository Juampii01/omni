"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"

export function Sparkline({ data, color = "var(--chart-1)" }: { data: number[]; color?: string }) {
  const points = data.map((v, i) => ({ i, v }))
  const gradId = `sparkline-${color.replace(/[^a-z0-9]/gi, "")}`

  return (
    <div className="h-10 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
