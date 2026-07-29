import { createServiceClient } from "@/lib/supabase-service"

/** Cuenta hits en la ventana antes de permitir; inserta un hit si se
 * permite. Sin función atómica/advisory lock a propósito — el perfil de
 * concurrencia real de esta app (equipos chicos, no bots de alta
 * frecuencia) no lo justifica. */
export async function checkRateLimit(clientId: string, route: string, opts: { maxCalls: number; windowSeconds: number }): Promise<boolean> {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - opts.windowSeconds * 1000).toISOString()

  const { count, error } = await supabase
    .from("ai_rate_limit_hits")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("route", route)
    .gte("created_at", since)

  if (error) throw new Error(`Error chequeando rate limit: ${error.message}`)
  if ((count ?? 0) >= opts.maxCalls) return false

  await supabase.from("ai_rate_limit_hits").insert({ client_id: clientId, route })
  return true
}
