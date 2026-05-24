import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"
import { ResearchClient } from "./research-client"

export const metadata = { title: "Inteligencia" }
export const dynamic = "force-dynamic"

export default async function ResearchPage() {
  await requireAuth()
  const supabase = await createClient()

  const { data: requests } = await (supabase as any)
    .from("research_requests")
    .select("id, title, prompt, status, result_markdown, tokens_used, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(30)

  return <ResearchClient initialRequests={(requests as any[]) ?? []} />
}
