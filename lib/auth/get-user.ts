import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Tables } from "@/lib/supabase/types"

export type AuthUser = Tables<"profiles"> & {
  email: string
}

export async function getUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return null

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  let profile = data as Tables<"profiles"> | null

  // Si el perfil no existe (usuario creado antes de que el trigger on_auth_user_created
  // estuviera activo), lo creamos automáticamente con el service role para saltear RLS.
  if (!profile) {
    try {
      const serviceClient = await createServiceClient()

      // Determinar rol: owner sólo si aún no existe ningún owner en la cuenta.
      const { count: ownerCount } = await (serviceClient as any)
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "owner")
      const assignedRole = (ownerCount ?? 0) === 0 ? "owner" : "team"

      const { data: created } = await (serviceClient as any)
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email ?? "",
          full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
          avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
          role: assignedRole,
        })
        .select()
        .single()
      profile = created as Tables<"profiles"> | null
    } catch {
      // Falla CERRADO: si no pudimos obtener/crear un profile real y válido,
      // NO otorgamos acceso (y mucho menos rol elevado). Devolvemos null →
      // requireAuth() redirige a /login. El profile real se creará en el próximo
      // intento cuando el service role esté disponible.
      console.error("getUser: fallo al crear profile vía service role; denegando acceso (fail-closed)")
      return null
    }
  }

  if (!profile) return null

  return { ...profile, email: user.email ?? (profile as unknown as { email: string }).email ?? "" }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getUser()
  if (!user) redirect("/login")
  return user
}

export async function requireRole(
  ...roles: Array<"owner" | "admin" | "manager" | "team">
): Promise<AuthUser> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) redirect("/")
  return user
}
