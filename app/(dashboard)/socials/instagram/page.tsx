import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { InstagramClient } from "./instagram-client"

export const metadata = { title: "Instagram" }
export const dynamic = "force-dynamic"

export default async function InstagramPage() {
  await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  const [{ data: accounts }, { data: queue }, { data: media }, { data: conversations }] = await Promise.all([
    sb.from("instagram_accounts")
      .select("id, username, profile_picture_url, followers_count, ig_user_id, token_expires_at")
      .limit(5),
    sb.from("instagram_publish_queue")
      .select("*")
      .not("status", "eq", "published")
      .order("scheduled_for", { ascending: true })
      .limit(50),
    sb.from("instagram_media")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(12),
    sb.from("instagram_conversations")
      .select("*")
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false })
      .limit(30),
  ])

  return (
    <InstagramClient
      accounts={(accounts as any[]) ?? []}
      queue={(queue as any[]) ?? []}
      recentMedia={(media as any[]) ?? []}
      conversations={(conversations as any[]) ?? []}
    />
  )
}
