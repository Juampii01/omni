import { createServiceClient } from "@/lib/supabase-service"
import { isInternal } from "@/lib/auth/permissions"

/**
 * Server-side guards para route handlers. Uso:
 *   const ctx = await requireAuth(jwt)
 *   if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
 */

async function getProfile(jwt: string | null) {
  if (!jwt) return null
  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(jwt)
  if (error || !user) return null
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id, is_platform_admin")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile) return null
  return {
    user,
    role: (profile as any).role as string,
    clientId: (profile as any).client_id as string | null,
    isPlatformAdmin: (profile as any).is_platform_admin as boolean,
  }
}

/** Cualquier usuario autenticado con profile. */
export async function requireAuth(jwt: string | null) {
  return getProfile(jwt)
}

/** Solo staff interno (owner/admin/team) de un cliente. */
export async function requireInternal(jwt: string | null) {
  const ctx = await getProfile(jwt)
  if (!ctx || !isInternal(ctx.role)) return null
  return ctx
}

/** Solo staff de plataforma (dueño del SaaS, no de un tenant puntual). */
export async function requirePlatformAdmin(jwt: string | null) {
  const ctx = await getProfile(jwt)
  if (!ctx || !ctx.isPlatformAdmin) return null
  return ctx
}
