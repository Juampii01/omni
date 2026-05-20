import { requireRole } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { TeamClient } from "./team-client"

export const metadata = { title: "Equipo" }

export default async function TeamPage() {
  await requireRole("manager")
  const supabase = await createClient()

  const [{ data: membersData }, { data: depsData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, role, department_id, is_active, last_seen_at, created_at")
      .order("full_name"),
    supabase
      .from("departments")
      .select("id, name, color")
      .order("name"),
  ])

  return (
    <TeamClient
      initialMembers={(membersData as any[]) ?? []}
      departments={(depsData as any[]) ?? []}
    />
  )
}
