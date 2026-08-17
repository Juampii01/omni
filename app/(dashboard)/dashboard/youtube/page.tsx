"use client"

import { useEffect, useState, useCallback } from "react"
import { Play, Users, Eye, Film, ThumbsUp, MessageSquare, RefreshCw, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type Channel = {
  channelId: string
  title: string
  description: string | null
  thumbnail: string | null
  subscriberCount: number
  viewCount: number
  videoCount: number
}
type Video = {
  id: string
  title: string
  thumbnail: string | null
  publishedAt: string | null
  viewCount: number
  likeCount: number
  commentCount: number
}
type MetricsResponse = { connected: false } | { connected: true; channel: Channel; videos: Video[] }

const nf = new Intl.NumberFormat("es-AR")

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
          <Icon className="h-5 w-5 text-accent-foreground" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{nf.format(value)}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function YouTubePage() {
  const [data, setData] = useState<MetricsResponse | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const res = await fetchWithAuth("/api/omni/youtube/metrics")
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? "No se pudieron traer las métricas de YouTube")
      setData({ connected: false })
      return
    }
    setData(await res.json())
  }, [])

  useEffect(() => {
    load()
    const params = new URLSearchParams(window.location.search)
    if (params.get("connected") === "youtube") {
      toast.success("YouTube conectado")
      window.history.replaceState({}, "", window.location.pathname)
    }
    const err = params.get("youtube_error")
    if (err) {
      toast.error(`No se pudo conectar YouTube: ${err}`)
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [load])

  async function handleConnect() {
    setConnecting(true)
    const res = await fetchWithAuth("/api/omni/youtube/connect", { method: "POST" })
    const d = await res.json()
    setConnecting(false)
    if (!res.ok || !d.url) {
      toast.error(d.error ?? "No se pudo iniciar la conexión")
      return
    }
    window.location.href = d.url
  }

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">YouTube</h1>
          <p className="mt-1 text-sm text-muted-foreground">Métricas de tu canal para mejorar la creación de contenido.</p>
        </div>
        {data?.connected && (
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} /> Actualizar
          </Button>
        )}
      </div>

      {data === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : !data.connected ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Play className="h-5 w-5 text-accent-foreground" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base">Conectá tu canal de YouTube</CardTitle>
                <CardDescription>
                  Omni lee (solo lectura) las métricas de tu canal — suscriptores, vistas totales y el rendimiento de
                  cada video — para ayudarte a decidir qué contenido crear.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect} disabled={connecting}>
              <Play /> {connecting ? "Redirigiendo…" : "Conectar YouTube"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-4">
            {data.channel.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.channel.thumbnail} alt={data.channel.title} className="h-14 w-14 rounded-full" />
            )}
            <div>
              <p className="font-heading text-lg">{data.channel.title}</p>
              <a
                href={`https://www.youtube.com/channel/${data.channel.channelId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Ver canal <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={Users} label="Suscriptores" value={data.channel.subscriberCount} />
            <StatCard icon={Eye} label="Vistas totales" value={data.channel.viewCount} />
            <StatCard icon={Film} label="Videos" value={data.channel.videoCount} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Últimos videos</CardTitle>
              <CardDescription>Rendimiento de tus publicaciones más recientes.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.videos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no hay videos en el canal.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {data.videos.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 py-3">
                      {v.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.thumbnail} alt="" className="h-12 w-20 shrink-0 rounded object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <a
                          href={`https://www.youtube.com/watch?v=${v.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="line-clamp-1 text-sm font-medium hover:underline"
                        >
                          {v.title}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {v.publishedAt
                            ? new Date(v.publishedAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" /> {nf.format(v.viewCount)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp className="h-3.5 w-3.5" /> {nf.format(v.likeCount)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" /> {nf.format(v.commentCount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
