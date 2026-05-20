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
      const { data: created } = await (serviceClient as any)
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email ?? "",
          full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
          avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
          role: "owner" as const, // primer usuario sin perfil = owner
        })
        .select()
        .single()
      profile = created as Tables<"profiles"> | null
    } catch {
      // Si falla el insert (p.ej. SUPABASE_SERVICE_ROLE_KEY no está en las env vars de Vercel),
      // devolvemos un perfil sintético para cortar el loop de redirección.
      // El perfil real se insertará la próxima vez que haya conectividad con el service role.
      return {
        id: user.id,
        email: user.email ?? "",
        full_name: (user.user_metadata?.full_name as string) ?? null,
        avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
        role: "owner" as const,
        department_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as AuthUser
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
