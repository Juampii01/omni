import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { LeadsClient } from "./leads-client"

export const metadata = { title: "CRM · Leads" }

const PAGE_SIZE = 50

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; stage?: string }>
}) {
  await requireAuth()

  const params = await searchParams
  const page   = Math.max(1, parseInt(params.page ?? "1") || 1)
  const stage  = params.stage ?? "all"

  const supabase = await createClient()
  const sb       = supabase as any

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let leadsQuery = sb
    .from("leads")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (stage !== "all") {
    leadsQuery = leadsQuery.eq("stage", stage)
  }

  const [
    { data: leadsData, count: leadsCount },
    { data: profilesData },
    { data: depsData },
  ] = await Promise.all([
    leadsQuery,
    supabase.from("profiles").select("id, full_name, avatar_url").eq("is_active", true),
    supabase.from("departments").select("id, name, color").order("name"),
  ])

  const totalCount = leadsCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <LeadsClient
      initialLeads={(leadsData as any[]) ?? []}
      profiles={(profilesData as any[]) ?? []}
      departments={(depsData as any[]) ?? []}
      pagination={{ page, totalCount, totalPages, pageSize: PAGE_SIZE, stage }}
    />
  )
}
