import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { CompetitorsClient } from "./competitors-client"

export const metadata = { title: "Competidores" }

const PAGE_SIZE = 25

export default async function CompetitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const user = await requireAuth()

  const params = await searchParams
  const page   = Math.max(1, parseInt(params.page ?? "1") || 1)

  const supabase = await createClient()
  const sb       = supabase as any

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const { data: competitorsData, count } = await sb
    .from("competitors")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to)

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <CompetitorsClient
      initialCompetitors={(competitorsData as any[]) ?? []}
      userId={user.id}
      pagination={{ page, totalCount, totalPages, pageSize: PAGE_SIZE }}
    />
  )
}
