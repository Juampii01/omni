"use client"

import { useMemo, useState } from "react"
import { useInstagramData } from "@/hooks/useInstagramData"
import { useSocialConnection } from "@/hooks/useSocialConnection"
import { InstagramDataProvider } from "@/components/instagram/InstagramDataContext"
import { IGProfileHeader } from "./IGProfileHeader"
import { IGStoriesReel } from "./IGStoriesReel"
import { IGTabNav, type IGTab } from "./IGTabNav"
import { IGNotConnected } from "./IGNotConnected"
import { IGOverviewStats } from "./IGOverviewStats"
import { IGTopContent } from "./IGTopContent"
import { IGInsightsPanel } from "./IGInsightsPanel"
import { IGContentGrid } from "./IGContentGrid"
import { IGAudiencePanel } from "./IGAudiencePanel"
import { IGPublishPanel } from "./IGPublishPanel"
import { IGTabErrorBoundary } from "./IGTabErrorBoundary"

export function IGProPage() {
  const { summary, reels, loading, syncing, sync, refresh } = useInstagramData()
  const { disconnect } = useSocialConnection("instagram", { onConnectSuccess: () => void refresh() })
  const [tab, setTab] = useState<IGTab>("inicio")
  const [disconnecting, setDisconnecting] = useState(false)

  const connected = !!summary?.connected

  // Todos los hooks deben correr antes de cualquier return condicional
  const ctxValue = useMemo(
    () => ({
      connected,
      hasRealData: connected && reels.length > 0,
      summary,
      reels,
      loading,
      hasLoaded: !loading,
    }),
    [connected, reels, loading, summary],
  )

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await disconnect()
      await refresh()
    } finally {
      setDisconnecting(false)
    }
  }

  // No conectado
  if (!loading && (!summary || !connected)) {
    return <IGNotConnected />
  }

  // Loading skeleton
  if (loading && !summary) {
    return (
      <div className="animate-pulse border-b border-[var(--border)] px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center gap-8">
          <div className="w-28 h-28 rounded-full bg-[var(--muted)]" />
          <div className="flex-1 space-y-5">
            <div className="h-5 w-32 bg-[var(--muted)] rounded-full" />
            <div className="h-4 w-56 bg-[var(--muted)] rounded-full" />
            <div className="h-3 w-44 bg-[var(--muted)] rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <InstagramDataProvider value={ctxValue}>
      <div className="min-h-screen bg-[var(--background)]">
        {summary && (
          <IGProfileHeader
            summary={summary}
            syncing={syncing || disconnecting}
            onSync={() => void sync()}
            onDisconnect={() => void handleDisconnect()}
          />
        )}

        {reels.length > 0 && <IGStoriesReel reels={reels} />}

        <IGTabNav active={tab} onChange={setTab} />

        <div className="max-w-4xl mx-auto px-4 py-6">
          {tab === "inicio" && summary && (
            <IGTabErrorBoundary tabName="Inicio">
              <div className="space-y-5">
                <IGOverviewStats summary={summary} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <IGTopContent reels={reels} />
                  <IGInsightsPanel reels={reels} />
                </div>
              </div>
            </IGTabErrorBoundary>
          )}

          {tab === "contenido" && (
            <IGTabErrorBoundary tabName="Contenido">
              <IGContentGrid reels={reels} loading={loading} />
            </IGTabErrorBoundary>
          )}

          {tab === "audiencia" && (
            <IGTabErrorBoundary tabName="Audiencia">
              <IGAudiencePanel />
            </IGTabErrorBoundary>
          )}

          {tab === "publicar" && (
            <IGTabErrorBoundary tabName="Publicar">
              <IGPublishPanel />
            </IGTabErrorBoundary>
          )}
        </div>
      </div>
    </InstagramDataProvider>
  )
}
