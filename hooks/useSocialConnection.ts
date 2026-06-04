"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

export type SocialPlatform = "instagram"

interface UseSocialConnectionReturn {
  connected: boolean
  loading: boolean
  accountName: string | null
  accountPic: string | null
  connect: () => void
  disconnect: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Estado de conexión social (Instagram) adaptado a los endpoints reales de Omni:
 *   status:     GET  /api/instagram/account-summary
 *   connect:    GET  /api/instagram/oauth/start   (redirect)
 *   disconnect: DELETE /api/instagram/disconnect
 */
export function useSocialConnection(
  platform: SocialPlatform,
  options?: { onConnectSuccess?: () => void },
): UseSocialConnectionReturn {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accountName, setAccountName] = useState<string | null>(null)
  const [accountPic, setAccountPic] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/${platform}/account-summary`)
      if (res.ok) {
        const data = await res.json()
        setConnected(!!data.connected)
        setAccountName(data.accountName ?? null)
        setAccountPic(data.accountPic ?? null)
      }
    } catch {
      // mantener estado previo ante error de red
    } finally {
      setLoading(false)
    }
  }, [platform])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/${platform}/account-summary`)
        if (!cancelled && res.ok) {
          const data = await res.json()
          setConnected(!!data.connected)
          setAccountName(data.accountName ?? null)
          setAccountPic(data.accountPic ?? null)
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [platform])

  // Detectar retorno de OAuth (?connect_success / ?ig_connected)
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("connect_success") === platform || params.get("ig_connected") === "1") {
      toast.success("Instagram conectado correctamente")
      options?.onConnectSuccess?.()
      void refresh()
      params.delete("connect_success")
      params.delete("ig_connected")
      const qs = params.toString()
      window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = useCallback(() => {
    window.location.href = `/api/${platform}/oauth/start`
  }, [platform])

  const disconnect = useCallback(async () => {
    try {
      const res = await fetch(`/api/${platform}/disconnect`, { method: "DELETE" })
      if (res.ok) {
        setConnected(false)
        await refresh()
      } else {
        toast.error("Error al desconectar Instagram")
      }
    } catch {
      toast.error("Error al desconectar Instagram")
    }
  }, [platform, refresh])

  return { connected, loading, accountName, accountPic, connect, disconnect, refresh }
}
