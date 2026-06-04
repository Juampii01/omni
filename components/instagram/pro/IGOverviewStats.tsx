"use client"

import { Users, Eye, TrendingUp, Compass, FileText } from "lucide-react"
import { IG_GRADIENT_CSS } from "./ig-theme"
import type { InstagramAccountSummary } from "@/hooks/useInstagramData"

function fmt(n: number | null | undefined): string {
  if (n == null) return "—"
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(n)
}

function Card({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex-1 min-w-[110px] rounded-2xl p-4 border relative overflow-hidden ${
        highlight ? "border-transparent" : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      {highlight && <div className={`absolute inset-0 ${IG_GRADIENT_CSS} opacity-10 pointer-events-none`} />}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${highlight ? IG_GRADIENT_CSS : "bg-[var(--muted)]"}`}>
        <Icon size={15} className={highlight ? "text-white" : "text-[var(--muted-foreground)]"} strokeWidth={1.5} />
      </div>
      <div className="text-2xl font-bold text-[var(--foreground)] tabular-nums mb-0.5">{value}</div>
      <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
      {sub && <div className="text-xs text-emerald-500 font-semibold mt-1">{sub}</div>}
    </div>
  )
}

export function IGOverviewStats({ summary }: { summary: InstagramAccountSummary }) {
  const snap = summary.latestSnapshot
  const er = snap?.engagementRate ?? null
  const erLabel = er != null ? (er > 5 ? "Excelente" : er >= 2 ? "Normal" : "Mejorable") : undefined

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <Card icon={Users} label="Seguidores" value={fmt(snap?.followers ?? 0)} highlight />
      <Card icon={Eye} label="Views totales" value={fmt(snap?.totalViews ?? 0)} />
      <Card
        icon={TrendingUp}
        label="Engagement"
        value={er != null ? er.toFixed(2) + "%" : "—"}
        sub={erLabel}
      />
      <Card icon={Compass} label="Alcance" value={fmt(snap?.reach ?? null)} />
      <Card icon={FileText} label="Posts" value={fmt(snap?.posts ?? 0)} />
    </div>
  )
}
