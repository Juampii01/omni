import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"
import { LaunchesClient } from "./launches-client"

export const metadata = { title: "Lanzamientos" }
export const dynamic = "force-dynamic"

export default async function LaunchesPage() {
  await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  const [{ data: launches }, { data: participants }] = await Promise.all([
    sb.from("launches")
      .select("*")
      .order("created_at", { ascending: false }),
    sb.from("launch_participants")
      .select("id, launch_id, full_name, email, paid, amount_paid, registered_at"),
  ])

  return (
    <LaunchesClient
      initialLaunches={(launches as any[]) ?? []}
      initialParticipants={(participants as any[]) ?? []}
    />
  )
}
