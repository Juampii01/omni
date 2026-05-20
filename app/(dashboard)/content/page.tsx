import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { ContentClient } from "./content-client"

export const metadata = { title: "Contenido" }

export default async function ContentPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: contentData } = await (supabase as any)
    .from("content_pieces")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <ContentClient
      initialContent={(contentData as any[]) ?? []}
      userId={user.id}
    />
  )
}
