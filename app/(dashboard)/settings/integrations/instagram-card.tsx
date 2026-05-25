"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Instagram, CheckCircle2, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface IGAccount {
  id: string
  ig_username: string
  ig_name: string | null
  ig_profile_picture_url: string | null
  followers_count: number | null
  is_active: boolean
}

interface InstagramCardProps {
  account: IGAccount | null
}

export function InstagramCard({ account }: InstagramCardProps) {
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnected, setDisconnected] = useState(false)

  const isConnected = account && !disconnected

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/instagram/disconnect", { method: "DELETE" })
      if (!res.ok) throw new Error("Error al desconectar")
      setDisconnected(true)
      toast.success("Instagram desconectado")
    } catch {
      toast.error("No se pudo desconectar. Intentá de nuevo.")
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        {/* Icon / Avatar */}
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {isConnected && account.ig_profile_picture_url ? (
            <Image
              src={account.ig_profile_picture_url}
              alt={account.ig_username}
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          ) : (
            <Instagram className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Instagram</p>
            {isConnected && (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            )}
          </div>
          {isConnected ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground truncate">
                @{account.ig_username}
                {account.followers_count != null && (
                  <> · {account.followers_count.toLocaleString()} seguidores</>
                )}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Métricas de reach, seguidores y contenido
            </p>
          )}
        </div>

        {/* Action */}
        {isConnected ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              asChild
            >
              <a href="/socials/instagram">
                <ExternalLink className="h-3 w-3 mr-1" />
                Abrir
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
          <Button
            size="sm"
            variant="outline"
            className="text-xs flex-shrink-0"
            asChild
          >
            <a href="/api/instagram/oauth/start">
              Conectar
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
