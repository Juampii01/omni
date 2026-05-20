import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { DiscoveryClient } from "./discovery-client"

export const metadata = { title: "Discovery" }

export default async function DiscoveryPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: formsData } = await (supabase as any)
    .from("discovery_forms")
    .select("*")
    .order("created_at", { ascending: false })

  const forms = (formsData as any[]) ?? []

  // Fetch response counts for each form
  let responseCounts: Record<string, number> = {}
  if (forms.length > 0) {
    const formIds = forms.map((f: any) => f.id)
    const { data: countsData } = await (supabase as any)
      .from("discovery_responses")
      .select("form_id")
      .in("form_id", formIds)

    if (countsData) {
      for (const row of countsData as any[]) {
        responseCounts[row.form_id] = (responseCounts[row.form_id] ?? 0) + 1
      }
    }
  }

  const formsWithCounts = forms.map((f: any) => ({
    ...f,
    response_count: responseCounts[f.id] ?? 0,
  }))

  return (
    <DiscoveryClient
      initialForms={formsWithCounts}
      currentUserId={user.id}
    />
  )
}
