"use client"

import { Play } from "lucide-react"
import { IG_GRADIENT_CSS } from "./ig-theme"
import type { UserReelRow } from "@/hooks/useInstagramData"

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(n)
}

export function IGStoriesReel({ reels, onSelect }: { reels: UserReelRow[]; onSelect?: (r: UserReelRow) => void }) {
  const top = [...reels].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 8)
  if (!top.length) return null

  return (
    <div className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {top.map((reel) => (
            <button
              key={reel.id}
              onClick={() => onSelect?.(reel)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
            >
              <div className={`p-[2.5px] rounded-full ${IG_GRADIENT_CSS} group-hover:opacity-80 transition-opacity`}>
                <div className="p-[2px] rounded-full bg-[var(--background)]">
                  <div className="w-14 h-14 rounded-full overflow-hidden relative bg-[var(--card)]">
                    {reel.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={reel.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full ${IG_GRADIENT_CSS} flex items-center justify-center`}>
                        <Play size={18} className="text-white" fill="white" />
                      </div>
                    )}
                    <div className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                      <Play size={8} className="text-white" fill="white" />
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-[var(--muted-foreground)] w-16 text-center truncate">
                {fmt(reel.viewsCount)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
