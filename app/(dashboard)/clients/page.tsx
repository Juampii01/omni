import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { ClientsClient } from "./clients-client"

export const metadata = { title: "Clientes" }
export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  const [{ data: clients }, { data: profiles }] = await Promise.all([
    sb.from("clients")
      .select("*")
      .order("created_at", { ascending: false }),
    sb.from("profiles")
      .select("id, full_name, avatar_url")
      .eq("is_active", true),
  ])

  return (
    <ClientsClient
      initialClients={(clients as any[]) ?? []}
      profiles={(profiles as any[]) ?? []}
    />
  )
}
