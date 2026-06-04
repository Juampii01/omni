"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError"
}

export interface InstagramAccountSummary {
  connected: boolean
  accountName?: string
  accountPic?: string | null
  expiresAt?: string | null
  tokenExpired?: boolean
  latestSnapshot?: {
    date: string | null
    followers: number
    posts: number
    engagementRate?: number | null
    totalViews?: number | null
    reach?: number | null
    profileVisits?: number | null
  } | null
  reelCount?: number
}

export interface UserReelRow {
  id: string
  instagramId: string
  shortcode: string
  url: string
  thumbnailUrl: string | null
  videoUrl: string | null
  caption: string | null
  likesCount: number
  commentsCount: number
  viewsCount: number
  publishedAt: string | null
  syncedAt: string | null
}

interface UseInstagramDataReturn {
  summary: InstagramAccountSummary | null
  reels: UserReelRow[]
  loading: boolean
  hasLoaded: boolean
  syncing: boolean
  sync: () => Promise<void>
  refresh: () => Promise<void>
}

/** Carga summary + reels de la cuenta activa. AbortController evita updates en componentes desmontados. */
export function useInstagramData(): UseInstagramDataReturn {
  const [summary, setSummary] = useState<InstagramAccountSummary | null>(null)
  const [reels, setReels] = useState<UserReelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const [sumRes, reelsRes] = await Promise.all([
        fetch("/api/instagram/account-summary", { signal: controller.signal }),
        fetch("/api/instagram/reels", { signal: controller.signal }),
      ])
      if (controller.signal.aborted) return
      if (sumRes.ok) setSummary((await sumRes.json()) as InstagramAccountSummary)
      if (reelsRes.ok) {
        const json = (await reelsRes.json()) as { reels?: UserReelRow[] }
        setReels(json.reels ?? [])
      }
      setHasLoaded(true)
    } catch (err) {
      if (isAbortError(err)) return
      setHasLoaded(true)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return () => abortRef.current?.abort()
  }, [refresh])

  const sync = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/instagram/sync", { method: "POST" })
      if (res.status === 401) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(
          body.error === "TOKEN_EXPIRED"
            ? "Tu conexión con Instagram expiró. Reconectala para volver a sincronizar."
            : "Sesión expirada. Volvé a iniciar sesión.",
        )
        return
      }
      if (res.status === 404) {
        toast.error("No hay una cuenta de Instagram conectada.")
        return
      }
      if (res.status === 429) {
        toast.error("Instagram está limitando las peticiones. Probá en unos minutos.")
        return
      }
      if (!res.ok) {
        toast.error("No pudimos sincronizar Instagram. Intentá de nuevo.")
        return
      }
      toast.success("Instagram sincronizado.")
      await refresh()
    } catch {
      toast.error("Error de red al sincronizar Instagram.")
    } finally {
      setSyncing(false)
    }
  }, [refresh])

  return { summary, reels, loading, hasLoaded, syncing, sync, refresh }
}
