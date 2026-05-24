import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ClientDetail } from "./client-detail"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const sb = supabase as any
  const { data } = await sb.from("clients").select("full_name").eq("id", id).single()
  return { title: data?.full_name ?? "Cliente" }
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const supabase = await createClient()
  const sb = supabase as any

  const [
    { data: client },
    { data: contacts },
    { data: revenue },
    { data: allClients },
  ] = await Promise.all([
    sb.from("clients").select("*").eq("id", id).single(),
    sb.from("contacts").select("*").eq("client_id", id).order("is_primary", { ascending: false }),
    sb.from("revenue_records")
      .select("*")
      .eq("client_id", id)
      .order("period_month", { ascending: false })
      .limit(12),
    sb.from("clients").select("id, full_name, parent_client_id").order("full_name"),
  ])

  if (!client) notFound()

  // Fetch tasks tagged with the client's first word (e.g. "ann" for "Ann Sahakyan")
  const firstWord = (client.full_name as string).toLowerCase().split(" ")[0]
  const { data: tasks } = await sb
    .from("tasks")
    .select("*")
    .contains("tags", [firstWord])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <ClientDetail
      client={client}
      contacts={(contacts as any[]) ?? []}
      revenue={(revenue as any[]) ?? []}
      tasks={(tasks as any[]) ?? []}
      allClients={(allClients as any[]) ?? []}
    />
  )
}
