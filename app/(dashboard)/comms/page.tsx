import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { CommsClient } from "./comms-client"

export const metadata = { title: "Comunicaciones" }

export default async function CommsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const [{ data: announcementsData }, { data: profilesData }] = await Promise.all([
    (supabase as any)
      .from("announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email"),
  ])

  const profilesMap: Record<string, { full_name: string | null; email: string }> = {}
  for (const p of (profilesData as any[]) ?? []) {
    profilesMap[p.id] = { full_name: p.full_name, email: p.email }
  }

  return (
    <CommsClient
      initialAnnouncements={(announcementsData as any[]) ?? []}
      profiles={profilesMap}
      userId={user.id}
      isAdmin={user.role === "owner" || user.role === "admin"}
    />
  )
}
