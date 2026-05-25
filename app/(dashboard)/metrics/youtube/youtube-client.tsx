"use client"

import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Youtube, Users, Eye, Clock, Play, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Image from "next/image"

// ── Types ─────────────────────────────────────────────────────────────────────

interface YTChannel {
  id: string
  channel_id: string
  channel_title: string
  custom_url: string | null
  thumbnail_url: string | null
  subscribers_count: number | null
  video_count: number | null
  total_views: number | null
  last_synced_at: string | null
}

interface YTVideo {
  id: string
  video_id: string
  title: string
  thumbnail_url: string | null
  published_at: string | null
  duration_seconds: number | null
  views: number
  likes: number
  comments: number
  watch_time_minutes: number | null
  avg_view_duration: number | null
  avg_view_percentage: number | null
}

interface YouTubeClientProps {
  channel: YTChannel
  videos: YTVideo[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtK(n: number | null): string {
  if (n === null) return "N/A"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("es-AR")
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "0:00"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${m}:${String(s).padStart(2, "0")}`
}

function fmtSyncDate(iso: string | null): string {
  if (!iso) return "Nunca"
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fmtPublished(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function YouTubeClient({ channel, videos }: YouTubeClientProps) {
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/youtube/sync", { method: "POST" })
      const data = (await res.json()) as { ok?: boolean; videos?: number; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error al sincronizar")
      toast.success(`Sincronizado: ${data.videos} videos. Recargá para ver los datos.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al sincronizar")
    } finally {
      setSyncing(false)
    }
  }

  // Total views from videos loaded (top 10)
  const totalViewsTop10 = videos.reduce((s, v) => s + v.views, 0)

  // Average view duration from videos that have it
  const videosWithAvgDuration = videos.filter(v => v.avg_view_duration !== null && v.avg_view_duration! > 0)
  const avgViewDuration =
    videosWithAvgDuration.length > 0
      ? videosWithAvgDuration.reduce((s, v) => s + (v.avg_view_duration ?? 0), 0) /
        videosWithAvgDuration.length
      : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="YouTube"
        description={`${channel.channel_title} · Sync: ${fmtSyncDate(channel.last_synced_at)}`}
        icon={Youtube}
      >
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sincronizar
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Suscriptores"
          value={fmtK(channel.subscribers_count)}
          sub="total del canal"
          icon={Users}
          color="bg-red-500/10 text-red-500"
        />
        <KpiCard
          label="Videos totales"
          value={channel.video_count !== null ? channel.video_count.toLocaleString("es-AR") : "N/A"}
          sub="publicados"
          icon={Play}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <KpiCard
          label="Views totales"
          value={fmtK(channel.total_views)}
          sub="acumulado del canal"
          icon={Eye}
          color="bg-blue-500/10 text-blue-400"
        />
        <KpiCard
          label="Avg view duration"
          value={avgViewDuration !== null ? fmtDuration(Math.round(avgViewDuration)) : "N/A"}
          sub={videosWithAvgDuration.length > 0 ? "promedio top videos" : "sin datos de analytics"}
          icon={Clock}
          color="bg-violet-500/10 text-violet-400"
        />
      </div>

      {/* Top 10 videos */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Top 10 videos por views</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-4">
              <Youtube className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Aún no hay videos sincronizados. Presioná "Sincronizar" para cargar los datos.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {videos.map((video, idx) => (
                <div key={video.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                  {/* Rank */}
                  <span className="text-xs font-mono text-muted-foreground w-5 flex-shrink-0 text-right">
                    {idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="w-16 h-9 rounded bg-muted flex-shrink-0 overflow-hidden">
                    {video.thumbnail_url ? (
                      <Image
                        src={video.thumbnail_url}
                        alt={video.title}
                        width={64}
                        height={36}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium truncate block hover:text-emerald-400 transition-colors"
                    >
                      {video.title}
                    </a>
                    <div className="flex items-center gap-3 mt-0.5">
                      {video.published_at && (
                        <span className="text-xs text-muted-foreground">
                          {fmtPublished(video.published_at)}
                        </span>
                      )}
                      {video.duration_seconds !== null && video.duration_seconds > 0 && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {fmtDuration(video.duration_seconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums font-mono">
                        {fmtK(video.views)}
                      </p>
                      <p className="text-xs text-muted-foreground">views</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm tabular-nums font-mono text-muted-foreground">
                        {fmtK(video.likes)}
                      </p>
                      <p className="text-xs text-muted-foreground">likes</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {videos.length > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Total top 10: {fmtK(totalViewsTop10)} views
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
