"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"

export type SessionInfo = {
  userId: string
  email: string
  role: string
  clientId: string | null
  clientName: string
  fullName: string | null
  isPlatformAdmin: boolean
  viewingAs: boolean
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/** Sesión del usuario logueado + su client_id — todas las páginas del
 * dashboard la necesitan para scopear sus llamadas a la API. Redirige a
 * /login si no hay sesión o no hay profile asociado. clientId puede ser
 * null para staff de plataforma (no pertenece a ningún tenant). */
export function useSession() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!user) {
        router.replace("/login")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, client_id, full_name, is_platform_admin")
        .eq("id", user.id)
        .maybeSingle()
      if (!profile) {
        router.replace("/login")
        return
      }
      const isPlatformAdmin = (profile as any).is_platform_admin ?? false
      let clientId = (profile as any).client_id as string | null
      let viewingAs = false
      if (isPlatformAdmin) {
        const viewAsClientId = readCookie("omni_view_as")
        if (viewAsClientId) {
          clientId = viewAsClientId
          viewingAs = true
        }
      }
      let clientName = ""
      if (clientId) {
        const { data: client } = await supabase.from("clients").select("name").eq("id", clientId).maybeSingle()
        clientName = (client as any)?.name ?? ""
      }
      if (cancelled) return
      setSession({
        userId: user.id,
        email: user.email ?? "",
        role: (profile as any).role,
        clientId,
        clientName,
        fullName: (profile as any).full_name ?? null,
        isPlatformAdmin,
        viewingAs,
      })
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { session, loading }
}
