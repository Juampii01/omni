import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { ContentClient } from "./content-client"

export const metadata = { title: "Contenido" }

const PAGE_SIZE = 25

export default async function ContentPage({
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

  const { data: contentData, count } = await sb
    .from("content_pieces")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <ContentClient
      initialContent={(contentData as any[]) ?? []}
      userId={user.id}
      pagination={{ page, totalCount, totalPages, pageSize: PAGE_SIZE }}
    />
  )
}
