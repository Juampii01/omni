"use client"

import { Lightbulb, Flame, Target } from "lucide-react"
import type { UserReelRow } from "@/hooks/useInstagramData"

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(n)
}

export function IGInsightsPanel({ reels }: { reels: UserReelRow[] }) {
  if (reels.length < 3) return null

  const avg = reels.reduce((s, r) => s + r.viewsCount, 0) / reels.length
  const top = [...reels].sort((a, b) => b.viewsCount - a.viewsCount)[0]
  const viral = reels.filter((r) => r.viewsCount > avg * 1.5).length
  const topEr = [...reels].sort((a, b) => {
    const erA = a.viewsCount > 0 ? (a.likesCount + a.commentsCount) / a.viewsCount : 0
    const erB = b.viewsCount > 0 ? (b.likesCount + b.commentsCount) / b.viewsCount : 0
    return erB - erA
  })[0]

  const items = [
    {
      icon: Flame,
      color: "#FCB045",
      title: "Mejor reel",
      desc: `${fmt(top.viewsCount)} views — ${(((top.viewsCount / avg) - 1) * 100).toFixed(0)}% sobre el promedio`,
    },
    {
      icon: Target,
      color: "#833AB4",
      title: "Mayor engagement",
      desc:
        topEr.viewsCount > 0
          ? `${(((topEr.likesCount + topEr.commentsCount) / topEr.viewsCount) * 100).toFixed(1)}% de ER`
          : "Sin datos suficientes",
    },
    {
      icon: Lightbulb,
      color: "#FD1D1D",
      title: `${Math.round((viral / reels.length) * 100)}% viral`,
      desc: `${viral} de ${reels.length} reels superan 1.5× el promedio`,
    },
  ]

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
        <Lightbulb size={15} className="text-[var(--muted-foreground)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">Lo que está funcionando</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {items.map(({ icon: Icon, color, title, desc }, i) => (
          <div key={i} className="px-5 py-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: color + "22" }}>
              <Icon size={14} style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)] mb-0.5">{title}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
