"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Youtube, CheckCircle2, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface YouTubeChannel {
  id: string
  channel_id: string
  channel_title: string
  thumbnail_url: string | null
  subscribers_count: number | null
  is_active: boolean
  last_synced_at: string | null
}

interface YouTubeCardProps {
  channel: YouTubeChannel | null
}

function fmtSubscribers(n: number | null): string {
  if (n === null) return ""
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("es-AR")
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "Sin sincronizar"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "hace un momento"
  if (mins < 60) return `hace ${mins} ${mins === 1 ? "minuto" : "minutos"}`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} ${hrs === 1 ? "hora" : "horas"}`
  const days = Math.floor(hrs / 24)
  return `hace ${days} ${days === 1 ? "día" : "días"}`
}

export function YouTubeCard({ channel }: YouTubeCardProps) {
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnected, setDisconnected] = useState(false)

  const isConnected = channel && !disconnected

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/youtube/disconnect", { method: "DELETE" })
      if (!res.ok) throw new Error("Error al desconectar")
      setDisconnected(true)
      toast.success("YouTube desconectado")
    } catch {
      toast.error("No se pudo desconectar. Intentá de nuevo.")
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        {/* Icon / Thumbnail */}
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {isConnected && channel.thumbnail_url ? (
            <Image
              src={channel.thumbnail_url}
              alt={channel.channel_title}
              width={40}
              height={40}
              className="object-cover w-full h-full rounded-lg"
            />
          ) : (
            <Youtube className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">YouTube</p>
            {isConnected && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                <Badge
                  variant="secondary"
                  className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                >
                  Conectado
                </Badge>
              </>
            )}
          </div>
          {isConnected ? (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground truncate">
                {channel.channel_title}
                {channel.subscribers_count !== null && (
                  <> · {fmtSubscribers(channel.subscribers_count)} suscriptores</>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Último sync: {fmtRelative(channel.last_synced_at)}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">
                Suscriptores, views y watch time
              </p>
              <p className="text-xs text-muted-foreground/60">
                Requiere cuenta de Google con canal de YouTube
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {isConnected ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
              <a href="/metrics/youtube">
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver analytics
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Desconectar"
              )}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="text-xs flex-shrink-0" asChild>
            <a href="/api/youtube/oauth/start">Conectar</a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
