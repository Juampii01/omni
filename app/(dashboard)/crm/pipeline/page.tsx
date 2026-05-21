import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { PipelineClient } from "./pipeline-client"

export const metadata = { title: "Pipeline" }

export default async function PipelinePage() {
  await requireAuth()
  const supabase = await createClient()

  const [{ data: leads }, { data: profiles }] = await Promise.all([
    (supabase as any)
      .from("leads")
      .select("id, full_name, email, phone, source, stage, amount, notes")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    (supabase as any)
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true),
  ])

  return (
    <PipelineClient
      initialLeads={leads ?? []}
      profiles={profiles ?? []}
    />
  )
}
