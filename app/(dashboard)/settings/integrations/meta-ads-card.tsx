"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart2, CheckCircle2, Loader2, ExternalLink, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface MetaAdsAccount {
  id: string
  meta_account_id: string
  account_name: string
  currency: string
  is_active: boolean
  last_synced_at: string | null
}

interface MetaAdsCardProps {
  account: MetaAdsAccount | null
}

function fmtSyncDate(iso: string | null): string {
  if (!iso) return "Sin sincronizar"
  const d = new Date(iso)
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function MetaAdsCard({ account }: MetaAdsCardProps) {
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnected, setDisconnected] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const isConnected = account && !disconnected

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/meta-ads/disconnect", { method: "DELETE" })
      if (!res.ok) throw new Error("Error al desconectar")
      setDisconnected(true)
      toast.success("Meta Ads desconectado")
    } catch {
      toast.error("No se pudo desconectar. Intentá de nuevo.")
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/meta-ads/sync", { method: "POST" })
      const data = await res.json() as { ok?: boolean; campaigns?: number; insights?: number; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error al sincronizar")
      toast.success(`Sincronizado: ${data.campaigns} campañas, ${data.insights} registros`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al sincronizar")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        {/* Ícono */}
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <BarChart2 className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Meta Ads</p>
            {isConnected && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  Conectado
                </Badge>
              </>
            )}
          </div>
          {isConnected ? (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground truncate">
                {account.account_name}
                {account.currency && <> · {account.currency}</>}
              </p>
              <p className="text-xs text-muted-foreground">
                Última sync: {fmtSyncDate(account.last_synced_at)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Gasto, CPL, CTR y creativos activos
            </p>
          )}
        </div>

        {/* Acciones */}
        {isConnected ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sincronizar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              asChild
            >
              <a href="/metrics/ads">
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver métricas
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
            <a href="/api/meta-ads/oauth/start">
              Conectar
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
