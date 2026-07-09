import { createClient } from "@/lib/supabase"

/** Fetch autenticado hacia nuestras propias API routes — adjunta el JWT de
 * la sesión actual como Bearer token (mismo patrón que usaba admin-omni-view
 * en Smart-Scale). */
export async function fetchWithAuth(url: string, init?: RequestInit) {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers = new Headers(init?.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  return fetch(url, { ...init, headers })
}
