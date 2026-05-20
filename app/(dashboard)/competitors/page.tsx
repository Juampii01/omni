import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { CompetitorsClient } from "./competitors-client"

export const metadata = { title: "Competidores" }

export default async function CompetitorsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: competitorsData } = await (supabase as any)
    .from("competitors")
    .select("*")
    .order("name", { ascending: true })

  return (
    <CompetitorsClient
      initialCompetitors={(competitorsData as any[]) ?? []}
      userId={user.id}
    />
  )
}
