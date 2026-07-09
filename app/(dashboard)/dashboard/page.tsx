"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, type Variants } from "motion/react"
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { TrendingUp, Users, CheckCircle2, Star } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useSession } from "@/lib/auth/use-session"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { Sparkline } from "@/components/ui/sparkline"

type Lead = { id: string; rating: number | null; purchased: boolean; created_at: string }
type WeekPoint = { week: string; leads: number; avgRating: number | null }

function groupByWeek(leads: Lead[]): WeekPoint[] {
  const buckets = new Map<string, { count: number; ratingSum: number; ratingCount: number }>()
  for (const lead of leads) {
    const d = new Date(lead.created_at)
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = monday.toISOString().slice(0, 10)
    const bucket = buckets.get(key) ?? { count: 0, ratingSum: 0, ratingCount: 0 }
    bucket.count += 1
    if (lead.rating != null) {
      bucket.ratingSum += lead.rating
      bucket.ratingCount += 1
    }
    buckets.set(key, bucket)
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, b]) => ({
      week: new Date(week).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
      leads: b.count,
      avgRating: b.ratingCount > 0 ? Number((b.ratingSum / b.ratingCount).toFixed(2)) : null,
    }))
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" } }),
}

function StatCard({
  icon: Icon,
  label,
  value,
  decimals,
  sublabel,
  sparkData,
  sparkColor,
  index,
}: {
  icon: React.ElementType
  label: string
  value: number
  decimals?: number
  sublabel?: string
  sparkData: number[]
  sparkColor: string
  index: number
}) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={index}>
      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <Icon className="h-4 w-4 text-accent-foreground" strokeWidth={1.75} />
            </div>
            <Sparkline data={sparkData} color={sparkColor} />
          </div>
        </CardHeader>
        <CardContent className="px-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 font-heading text-3xl">
            <AnimatedCounter value={value} decimals={decimals} />
          </p>
          {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { session } = useSession()
  const supabase = useMemo(() => createClient(), [])
  const [leads, setLeads] = useState<Lead[] | null>(null)

  useEffect(() => {
    if (!session) return
    supabase
      .from("leads")
      .select("id, rating, purchased, created_at")
      .eq("client_id", session.clientId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setLeads((data ?? []) as Lead[]))
  }, [session, supabase])

  const chartData = useMemo(() => groupByWeek(leads ?? []), [leads])
  const total = leads?.length ?? 0
  const closed = leads?.filter((l) => l.purchased).length ?? 0
  const rated = leads?.filter((l) => l.rating != null) ?? []
  const avgRating = rated.length > 0 ? rated.reduce((s, l) => s + (l.rating ?? 0), 0) / rated.length : 0
  const conversionRate = total > 0 ? (closed / total) * 100 : 0

  const sparkLeads = chartData.map((c) => c.leads)
  const sparkRating = chartData.map((c) => c.avgRating ?? 0)

  if (leads === null) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl">Resumen</h1>
        <p className="mt-1 text-sm text-muted-foreground">{session?.clientName}</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard index={0} icon={Users} label="Leads totales" value={total} sparkData={sparkLeads.length ? sparkLeads : [0, 0]} sparkColor="var(--chart-1)" />
        <StatCard
          index={1}
          icon={CheckCircle2}
          label="Cerrados"
          value={closed}
          sublabel={total > 0 ? `${Math.round(conversionRate)}% de conversión` : undefined}
          sparkData={sparkLeads.length ? sparkLeads : [0, 0]}
          sparkColor="var(--chart-2)"
        />
        <StatCard index={2} icon={Star} label="Rating promedio" value={avgRating} decimals={1} sparkData={sparkRating.length ? sparkRating : [0, 0]} sparkColor="var(--chart-3)" />
        <StatCard index={3} icon={TrendingUp} label="Conversión" value={conversionRate} decimals={0} sublabel="% leads → cerrados" sparkData={sparkLeads.length ? sparkLeads : [0, 0]} sparkColor="var(--chart-1)" />
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}>
        <Card className="py-6">
          <CardHeader className="px-6">
            <CardTitle>Leads por semana</CardTitle>
            <CardDescription>Volumen de leads (barras) vs. rating promedio (línea)</CardDescription>
          </CardHeader>
          <CardContent className="px-6">
            <div className="h-72">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Todavía no hay leads cargados.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar yAxisId="left" dataKey="leads" name="Leads" fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={28} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgRating"
                      name="Rating promedio"
                      stroke="var(--chart-3)"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, strokeWidth: 0, fill: "var(--chart-3)" }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
