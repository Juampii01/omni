"use client"

import { useState } from "react"
import { Play, Heart, MessageCircle, Eye, TrendingUp, TrendingDown } from "lucide-react"
import type { UserReelRow } from "@/hooks/useInstagramData"

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(n)
}

function Badge({ views, avg }: { views: number; avg: number }) {
  if (avg === 0) return null
  const r = views / avg
  if (r >= 1.5) {
    return (
      <span className="absolute top-2 right-2 text-[9px] font-bold bg-black/70 text-[#FCB045] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
        <TrendingUp size={8} />+{Math.round(r * 100 - 100)}%
      </span>
    )
  }
  if (r <= 0.6) {
    return (
      <span className="absolute top-2 right-2 text-[9px] font-bold bg-black/70 text-[#FD1D1D] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
        <TrendingDown size={8} />-{Math.round(100 - r * 100)}%
      </span>
    )
  }
  return null
}

export function IGReelCard({
  reel,
  avgViews,
  onClick,
}: {
  reel: UserReelRow
  avgViews: number
  onClick?: (r: UserReelRow) => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="relative aspect-square bg-[var(--card)] overflow-hidden cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick?.(reel)}
    >
      {reel.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={reel.thumbnailUrl} alt="" className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-[var(--muted)] flex items-center justify-center">
          <Play size={24} className="text-[var(--muted-foreground)]" />
        </div>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        <Play size={12} className="text-white drop-shadow" fill="white" />
        <span className="text-xs font-bold text-white drop-shadow">{fmt(reel.viewsCount)}</span>
      </div>
      <Badge views={reel.viewsCount} avg={avgViews} />
      <div
        className={`absolute inset-0 bg-black/72 flex flex-col items-center justify-center gap-2 transition-opacity duration-200 ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Eye size={14} fill="white" className="text-white" strokeWidth={0} />
            <span className="text-sm font-bold text-white">{fmt(reel.viewsCount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart size={14} fill="white" className="text-white" strokeWidth={0} />
            <span className="text-sm font-bold text-white">{fmt(reel.likesCount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle size={14} fill="white" className="text-white" strokeWidth={0} />
            <span className="text-sm font-bold text-white">{fmt(reel.commentsCount)}</span>
          </div>
        </div>
        {reel.publishedAt && (
          <p className="text-[10px] text-white/60">
            {new Date(reel.publishedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
          </p>
        )}
      </div>
    </div>
  )
}
