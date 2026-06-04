"use client"

import { useState, useMemo } from "react"
import { Grid3X3, List, Eye, Heart, MessageCircle } from "lucide-react"
import { IGReelCard } from "./IGReelCard"
import type { UserReelRow } from "@/hooks/useInstagramData"

type Sort = "recent" | "views" | "likes" | "comments"

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(n)
}

export function IGContentGrid({ reels, loading }: { reels: UserReelRow[]; loading: boolean }) {
  const [sort, setSort] = useState<Sort>("recent")
  const [view, setView] = useState<"grid" | "list">("grid")
  const avg = reels.length > 0 ? reels.reduce((s, r) => s + r.viewsCount, 0) / reels.length : 0

  const sorted = useMemo(() => {
    const c = [...reels]
    if (sort === "views") c.sort((a, b) => b.viewsCount - a.viewsCount)
    if (sort === "likes") c.sort((a, b) => b.likesCount - a.likesCount)
    if (sort === "comments") c.sort((a, b) => b.commentsCount - a.commentsCount)
    if (sort === "recent") c.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    return c
  }, [reels, sort])

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-[3px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square bg-[var(--muted)] animate-pulse" />
        ))}
      </div>
    )
  }

  if (!reels.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)] text-sm">
        <Grid3X3 size={36} className="mb-3 opacity-30" />
        <p>No hay contenido. Sincronizá tu cuenta.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between py-3 px-1 mb-1">
        <div className="flex items-center gap-1 flex-wrap">
          {(["recent", "views", "likes", "comments"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                sort === s
                  ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
                  : "text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              {s === "recent" ? "Reciente" : s === "views" ? "Views" : s === "likes" ? "Likes" : "Comentarios"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setView("grid")} className={`p-1.5 rounded transition-colors ${view === "grid" ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
            <Grid3X3 size={16} />
          </button>
          <button onClick={() => setView("list")} className={`p-1.5 rounded transition-colors ${view === "list" ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-3 gap-[3px]">
          {sorted.map((r) => (
            <IGReelCard key={r.id} reel={r} avgViews={avg} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--muted)]">
                {r.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--foreground)] truncate">{r.caption ?? "Sin caption"}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString("es-AR") : "—"}
                </p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                {([
                  { I: Eye, v: r.viewsCount },
                  { I: Heart, v: r.likesCount },
                  { I: MessageCircle, v: r.commentsCount },
                ] as { I: React.ElementType; v: number }[]).map(({ I, v }, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <I size={11} className="text-[var(--muted-foreground)]" />
                    <span className="text-xs font-semibold text-[var(--foreground)]">{fmt(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-center gap-4 text-xs text-[var(--muted-foreground)]">
        <span>{reels.length} posts</span>
        <span>·</span>
        <span>Avg {fmt(Math.round(avg))} views</span>
      </div>
    </div>
  )
}
