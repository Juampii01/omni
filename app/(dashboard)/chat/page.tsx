import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { TeamChat } from "./team-chat"

export const dynamic = "force-dynamic"
export const metadata = { title: "Chat interno" }

export default async function ChatPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  const [{ data: messages }, { data: profiles }] = await Promise.all([
    sb.from("team_messages")
      .select("id, sender_id, body, created_at, channel")
      .eq("channel", "general")
      .order("created_at", { ascending: true })
      .limit(200),
    sb.from("profiles")
      .select("id, full_name, email, avatar_url")
      .eq("is_active", true),
  ])

  return (
    <TeamChat
      initialMessages={(messages as any[]) ?? []}
      currentUserId={user.id}
      profiles={(profiles as any[]) ?? []}
    />
  )
}
