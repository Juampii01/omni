import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { AutomationsClient } from "./automations-client"

export const metadata = { title: "Automatizaciones" }
export const dynamic = "force-dynamic"

export default async function AutomationsPage() {
  await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  const [{ data: automations }, { data: executions }] = await Promise.all([
    sb.from("automations")
      .select("*")
      .order("created_at", { ascending: false }),
    sb.from("automation_executions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50),
  ])

  return (
    <AutomationsClient
      initialAutomations={(automations as any[]) ?? []}
      recentExecutions={(executions as any[]) ?? []}
    />
  )
}
