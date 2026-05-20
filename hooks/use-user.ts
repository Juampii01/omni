"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { can, hasMinRole } from "@/lib/auth/permissions"
import type { UserRole } from "@/lib/constants"
import type { Tables } from "@/lib/supabase/types"

type UserProfile = Tables<"profiles">

async function fetchUser(): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return data
}

export function useUser() {
  const { data: user, error, isLoading, mutate } = useSWR("user-profile", fetchUser, {
    revalidateOnFocus: false,
  })

  return {
    user,
    role: user?.role as UserRole | undefined,
    isLoading,
    error,
    refetch: mutate,
    can: (permission: Parameters<typeof can>[1]) =>
      user ? can(user.role as UserRole, permission) : false,
    isAdmin: user ? hasMinRole(user.role as UserRole, "admin") : false,
    isOwner: user?.role === "owner",
  }
}
