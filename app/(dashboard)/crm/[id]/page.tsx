import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { LeadDetailClient } from "./lead-detail-client"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from("leads")
    .select("full_name")
    .eq("id", id)
    .single()
  return { title: data?.full_name ?? "Lead" }
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: lead }, { data: activities }, { data: tasks }, { data: profiles }] =
    await Promise.all([
      (supabase as any)
        .from("leads")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .single(),
      (supabase as any)
        .from("lead_activities")
        .select("*, profiles:user_id(id, full_name, avatar_url)")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      (supabase as any)
        .from("tasks")
        .select("id, title, status, priority, due_date, assigned_to")
        .eq("related_lead_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("is_active", true),
    ])

  if (!lead) notFound()

  return (
    <LeadDetailClient
      lead={lead}
      activities={activities ?? []}
      tasks={tasks ?? []}
      profiles={profiles ?? []}
    />
  )
}
