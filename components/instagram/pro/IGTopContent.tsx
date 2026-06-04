"use client"

import { Eye, Trophy } from "lucide-react"
import { IG_GRADIENT_CSS } from "./ig-theme"
import type { UserReelRow } from "@/hooks/useInstagramData"

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(n)
}

const MEDALS = ["1", "2", "3"]

export function IGTopContent({ reels }: { reels: UserReelRow[] }) {
  const top3 = [...reels].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 3)
  if (!top3.length) return null

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
        <Trophy size={15} className="text-[var(--muted-foreground)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">Top contenido</span>
      </div>
      <div className="p-4 flex gap-3">
        {top3.map((r, i) => (
          <div key={r.id} className="flex-1 min-w-0">
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--muted)] mb-2">
              {r.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full ${IG_GRADIENT_CSS} flex items-center justify-center`}>
                  <Eye size={20} className="text-white" />
                </div>
              )}
              <div className="absolute top-1.5 left-1.5 text-base">{MEDALS[i]}</div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                <div className="flex items-center gap-1">
                  <Eye size={10} className="text-white" />
                  <span className="text-xs font-bold text-white">{fmt(r.viewsCount)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
