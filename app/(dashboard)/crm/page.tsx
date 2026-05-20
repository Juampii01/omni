import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { LeadsClient } from "./leads-client"

export const metadata = { title: "CRM · Leads" }

export default async function CrmPage() {
  await requireAuth()
  const supabase = await createClient()

  const [{ data: leadsData }, { data: profilesData }, { data: depsData }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, avatar_url").eq("is_active", true),
    supabase.from("departments").select("id, name, color").order("name"),
  ])

  return (
    <LeadsClient
      initialLeads={(leadsData as any[]) ?? []}
      profiles={(profilesData as any[]) ?? []}
      departments={(depsData as any[]) ?? []}
    />
  )
}
