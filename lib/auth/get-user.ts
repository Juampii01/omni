import { createClient } from "@/lib/supabase/server"
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

  const profile = data as Tables<"profiles"> | null
  if (!profile) return null

  return { ...profile, email: user.email ?? profile.email }
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
