"use client"

import { RefreshCw, Loader2, LogOut, CheckCircle2 } from "lucide-react"
import { IGAvatarRing, IG_GRADIENT_CSS } from "./ig-theme"
import type { InstagramAccountSummary } from "@/hooks/useInstagramData"

interface Props {
  summary: InstagramAccountSummary
  syncing: boolean
  onSync: () => void
  onDisconnect: () => void
}

function StatPill({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center px-4">
      <span className="text-xl font-bold text-[var(--foreground)] tabular-nums">{value}</span>
      <span className="text-xs text-[var(--muted-foreground)] mt-0.5">{label}</span>
    </div>
  )
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(n)
}

export function IGProfileHeader({ summary, syncing, onSync, onDisconnect }: Props) {
  const snap = summary.latestSnapshot
  const username = summary.accountName ?? "tu_cuenta"
  const pic = summary.accountPic
  const reelCount = summary.reelCount ?? 0

  return (
    <div className="w-full border-b border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-6 py-8 flex items-start gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <IGAvatarRing size="xl" hasStory={!!snap}>
            {pic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pic} alt={username} className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className={`w-full h-full rounded-full ${IG_GRADIENT_CSS} flex items-center justify-center`}>
                <span className="text-white text-3xl font-bold">{username.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </IGAvatarRing>
        </div>

        <div className="flex-1 min-w-0">
          {/* Username row */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h1 className="text-xl font-light text-[var(--foreground)] tracking-tight">@{username}</h1>
            <CheckCircle2 className="w-5 h-5 text-[#0095F6]" fill="currentColor" strokeWidth={0} />
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={onSync}
                disabled={syncing}
                className="flex items-center gap-1.5 h-8 px-4 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm font-semibold hover:bg-[var(--muted)] transition-colors"
              >
                {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {syncing ? "Sincronizando…" : "Sincronizar"}
              </button>
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] text-sm hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                title="Desconectar"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center divide-x divide-[var(--border)] mb-4 -ml-4">
            <StatPill value={fmt(snap?.posts ?? 0)} label="publicaciones" />
            <StatPill value={fmt(snap?.followers ?? 0)} label="seguidores" />
            <StatPill value={fmt(reelCount)} label="reels" />
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${IG_GRADIENT_CSS} text-white`}>
              Cuenta conectada
            </span>
            {summary.tokenExpired && (
              <span className="text-xs text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] px-3 py-1 rounded-full">
                Token expirado — reconectá tu cuenta
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
