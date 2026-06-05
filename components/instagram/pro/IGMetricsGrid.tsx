"use client"

import { Eye, Heart, MessageCircle, TrendingUp, Zap, Calendar, BarChart3, Activity, Target, Flame } from "lucide-react"
import type { UserReelRow } from "@/hooks/useInstagramData"

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function fmt(n: number): string {
  if (!isFinite(n)) return "—"
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(Math.round(n))
}
function pct(n: number): string {
  return (isFinite(n) ? n : 0).toFixed(1) + "%"
}

function Card({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: accent ?? "var(--muted-foreground)" }} />
        <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      </div>
      <div className="text-xl font-bold text-[var(--foreground)] tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{sub}</div>}
    </div>
  )
}

/**
 * Grilla de KPIs detallados calculados desde los reels (views/likes/comments/fecha).
 * No depende de permisos de insights de cuenta ni de demografía.
 */
export function IGMetricsGrid({ reels }: { reels: UserReelRow[] }) {
  if (!reels.length) return null

  const n = reels.length
  const views = reels.map((r) => r.viewsCount)
  const totalViews = views.reduce((s, v) => s + v, 0)
  const totalLikes = reels.reduce((s, r) => s + r.likesCount, 0)
  const totalComments = reels.reduce((s, r) => s + r.commentsCount, 0)

  const avgViews = totalViews / n
  const avgLikes = totalLikes / n
  const avgComments = totalComments / n

  const sortedViews = [...views].sort((a, b) => a - b)
  const median = sortedViews[Math.floor(n / 2)] ?? 0
  const maxViews = Math.max(...views)

  const likeRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0
  const commentRate = totalViews > 0 ? (totalComments / totalViews) * 100 : 0
  const engRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0

  const viral = reels.filter((r) => r.viewsCount > avgViews * 1.5).length
  const viralPct = Math.round((viral / n) * 100)

  const now = Date.now()
  const last30 = reels.filter((r) => r.publishedAt && now - new Date(r.publishedAt).getTime() < 30 * 86_400_000).length

  // Mejor día para publicar (por engagement promedio)
  const wd = Array.from({ length: 7 }, () => ({ likes: 0, comments: 0, count: 0 }))
  for (const r of reels) {
    if (r.publishedAt) {
      const d = new Date(r.publishedAt).getDay()
      wd[d].likes += r.likesCount
      wd[d].comments += r.commentsCount
      wd[d].count++
    }
  }
  let bestDay = "—"
  let bestEng = -1
  wd.forEach((b, i) => {
    if (b.count > 0) {
      const e = (b.likes + b.comments) / b.count
      if (e > bestEng) {
        bestEng = e
        bestDay = WEEKDAYS[i]
      }
    }
  })

  const cards = [
    { icon: Eye, label: "Views promedio", value: fmt(avgViews), sub: "por reel" },
    { icon: BarChart3, label: "Views mediana", value: fmt(median), sub: "el reel típico" },
    {
      icon: TrendingUp,
      label: "Mejor reel",
      value: fmt(maxViews),
      sub: avgViews > 0 ? `${Math.round((maxViews / avgViews - 1) * 100)}% sobre el promedio` : undefined,
      accent: "#FCB045",
    },
    { icon: Heart, label: "Likes promedio", value: fmt(avgLikes), sub: `${pct(likeRate)} de views`, accent: "#FD1D1D" },
    { icon: MessageCircle, label: "Comentarios prom.", value: fmt(avgComments), sub: `${pct(commentRate)} de views` },
    { icon: Activity, label: "Engagement", value: pct(engRate), sub: "interacciones / views", accent: "#833AB4" },
    { icon: Zap, label: "Reels virales", value: `${viralPct}%`, sub: `${viral} de ${n} superan 1.5× prom.`, accent: "#FCB045" },
    { icon: Calendar, label: "Cadencia", value: String(last30), sub: "reels (últimos 30 días)" },
    { icon: Target, label: "Mejor día", value: bestDay, sub: "el de mayor engagement" },
  ]

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
        <Flame size={15} className="text-[var(--muted-foreground)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">Métricas detalladas</span>
        <span className="text-xs text-[var(--muted-foreground)] ml-auto">sobre {n} reels</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
        {cards.map((c, i) => (
          <Card key={i} {...c} />
        ))}
      </div>
    </div>
  )
}
