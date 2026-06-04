"use client"

import { Users, Globe, TrendingUp, MapPin, AlertCircle, BarChart3 } from "lucide-react"
import { useAudienceStats } from "@/hooks/useAudienceStats"
import { useAudienceDemographics } from "@/hooks/useAudienceDemographics"
import { useInstagramDataContext } from "@/components/instagram/InstagramDataContext"
import { IG_GRADIENT } from "./ig-theme"

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(n)
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-[var(--muted-foreground)] w-24 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + "%", background: color ?? IG_GRADIENT }} />
      </div>
      <span className="text-xs font-semibold text-[var(--foreground)] w-8 text-right">{Math.round(pct)}%</span>
    </div>
  )
}

export function IGAudiencePanel() {
  const { hasLoaded } = useInstagramDataContext()
  const { data: statsData, loading: statsLoading } = useAudienceStats()
  const demo = useAudienceDemographics()

  const loading = !hasLoaded || statsLoading || demo.status === "loading"

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-[var(--muted)] animate-pulse" />
        ))}
      </div>
    )
  }

  const hasDemoData = demo.status === "ok"
  const hasStats = !!statsData && statsData.reelStats.reelCount > 0

  if (!hasStats && !hasDemoData) {
    return (
      <div className="text-center py-16">
        <BarChart3 size={36} className="mx-auto text-[var(--muted-foreground)] opacity-40 mb-3" />
        <p className="text-sm text-[var(--muted-foreground)]">Sincronizá tu cuenta para ver la audiencia</p>
      </div>
    )
  }

  const genderAge = hasDemoData ? demo.data.genderAge : []
  const countryList = hasDemoData ? demo.data.country : []
  const cityList = hasDemoData ? demo.data.city : []
  const followerHistory = hasDemoData ? demo.data.followerHistory : []

  const femaleTotal = genderAge.filter((d) => d.gender === "F").reduce((s, d) => s + d.value, 0)
  const maleTotal = genderAge.filter((d) => d.gender === "M").reduce((s, d) => s + d.value, 0)
  const totalGender = femaleTotal + maleTotal
  const fPct = totalGender > 0 ? Math.round((femaleTotal / totalGender) * 100) : 50
  const mPct = 100 - fPct

  const byAge: Record<string, number> = {}
  for (const d of genderAge) byAge[d.ageRange] = (byAge[d.ageRange] ?? 0) + d.value
  const ageEntries = Object.entries(byAge).sort(([, a], [, b]) => b - a).slice(0, 6)
  const maxAge = ageEntries[0]?.[1] ?? 1

  const maxCountry = countryList[0]?.pct ?? 1
  const maxCity = cityList[0]?.pct ?? 1
  const histMax = followerHistory.length > 0 ? Math.max(...followerHistory.map((h) => h.value), 1) : 1

  const followers = statsData?.snapshots.at(-1)?.followers ?? 0

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">Seguidores</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{fmt(followers)}</p>
        </div>
        {statsData && (
          <>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Reels</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{statsData.reelStats.reelCount}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Views totales</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{fmt(statsData.reelStats.totalViews)}</p>
            </div>
          </>
        )}
      </div>

      {/* Insufficient demographics warning */}
      {demo.status === "insufficient_followers" && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-start gap-3">
          <AlertCircle size={15} className="text-[var(--muted-foreground)] flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--foreground)] mb-0.5">Demografía no disponible</p>
            <p className="text-xs text-[var(--muted-foreground)]">Instagram requiere mínimo 100 seguidores para mostrar datos demográficos.</p>
          </div>
        </div>
      )}

      {/* Gender split */}
      {hasDemoData && totalGender > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Users size={15} className="text-[var(--muted-foreground)]" /> Género
          </h3>
          <div className="flex-1 h-3 rounded-full overflow-hidden bg-[var(--muted)] flex">
            <div className="h-full" style={{ width: fPct + "%", background: "#E1306C" }} />
            <div className="h-full" style={{ width: mPct + "%", background: "#0095F6" }} />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-[var(--muted-foreground)]">Mujeres {fPct}%</span>
            <span className="text-xs text-[var(--muted-foreground)]">Hombres {mPct}%</span>
          </div>
        </div>
      )}

      {/* Age distribution */}
      {hasDemoData && ageEntries.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Users size={15} className="text-[var(--muted-foreground)]" /> Rango de edad
          </h3>
          {ageEntries.map(([age, val]) => (
            <BarRow key={age} label={age} value={val} max={maxAge} />
          ))}
        </div>
      )}

      {/* Countries */}
      {hasDemoData && countryList.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Globe size={15} className="text-[var(--muted-foreground)]" /> Países
          </h3>
          {countryList.map((c) => (
            <BarRow key={c.code} label={c.code} value={c.pct} max={maxCountry} color="#0095F6" />
          ))}
        </div>
      )}

      {/* Cities */}
      {hasDemoData && cityList.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <MapPin size={15} className="text-[var(--muted-foreground)]" /> Ciudades
          </h3>
          {cityList.map((c) => (
            <BarRow key={c.name} label={c.name} value={c.pct} max={maxCity} color="#833AB4" />
          ))}
        </div>
      )}

      {/* Follower trend */}
      {hasDemoData && followerHistory.length > 1 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-[var(--muted-foreground)]" /> Nuevos seguidores (últimos 30 días)
          </h3>
          <svg viewBox={`0 0 ${followerHistory.length * 10} 40`} className="w-full h-12" preserveAspectRatio="none">
            <defs>
              <linearGradient id="igSparkGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#833AB4" />
                <stop offset="100%" stopColor="#FCB045" />
              </linearGradient>
            </defs>
            <polyline
              points={followerHistory.map((h, i) => `${i * 10},${40 - (h.value / histMax) * 36}`).join(" ")}
              fill="none"
              stroke="url(#igSparkGrad)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[var(--muted-foreground)]">{followerHistory[0]?.date?.slice(5)}</span>
            <span className="text-xs text-[var(--muted-foreground)]">{followerHistory.at(-1)?.date?.slice(5)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
