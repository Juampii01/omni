import { createClient } from "@/lib/supabase/server"
import { CalendarClient } from "./calendar-client"
import { requireAuth } from "@/lib/auth/get-user"

export const metadata = { title: "Calendario — Omni" }

export default async function CalendarPage() {
  await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  const [tasksRes, leadsRes, settingsRes] = await Promise.all([
    sb
      .from("tasks")
      .select("id, title, priority, due_date, status")
      .not("due_date", "is", null)
      .not("status", "in", '("done","cancelled")')
      .is("deleted_at", null)
      .order("due_date", { ascending: true }),

    sb
      .from("leads")
      .select("id, full_name, stage, expected_close_date, amount")
      .is("deleted_at", null)
      .not("stage", "in", '("won","lost")')
      .not("expected_close_date", "is", null)
      .order("expected_close_date", { ascending: true }),

    sb
      .from("client_settings")
      .select("calendly_api_key_encrypted, calendly_name, calendly_email")
      .single(),
  ])

  const s = settingsRes.data
  const calendlyConnected = s?.calendly_api_key_encrypted
    ? { name: s.calendly_name ?? "", email: s.calendly_email ?? "" }
    : null

  return (
    <CalendarClient
      tasks={tasksRes.data ?? []}
      leads={leadsRes.data ?? []}
      calendlyConnected={calendlyConnected}
    />
  )
}
