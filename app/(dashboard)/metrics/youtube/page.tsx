import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { YouTubeClient } from "./youtube-client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Youtube } from "lucide-react"

export const metadata = { title: "YouTube — Métricas" }
export const dynamic = "force-dynamic"

export default async function YouTubeMetricsPage() {
  await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  // Buscar canal activo
  const { data: channel } = await sb
    .from("youtube_channels")
    .select("id, channel_id, channel_title, custom_url, thumbnail_url, subscribers_count, video_count, total_views, last_synced_at")
    .eq("is_active", true)
    .maybeSingle()

  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Youtube className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Sin canal de YouTube conectado</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Conectá tu canal para ver suscriptores, views y watch time de tus videos.
          </p>
        </div>
        <Button asChild className="bg-brand hover:bg-brand/90">
          <Link href="/settings/integrations">Conectar YouTube</Link>
        </Button>
      </div>
    )
  }

  // Top 10 videos por views
  const { data: videos } = await sb
    .from("youtube_videos")
    .select("id, video_id, title, thumbnail_url, published_at, duration_seconds, views, likes, comments, watch_time_minutes, avg_view_duration, avg_view_percentage")
    .eq("channel_id", channel.id)
    .order("views", { ascending: false })
    .limit(10)

  return (
    <YouTubeClient
      channel={channel}
      videos={(videos as any[]) ?? []}
    />
  )
}
