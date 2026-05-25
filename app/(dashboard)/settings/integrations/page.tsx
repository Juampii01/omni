import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/get-user"
import { InstagramCard } from "./instagram-card"
import { MetaAdsCard } from "./meta-ads-card"
import { YouTubeCard } from "./youtube-card"

export const metadata = { title: "Integraciones" }

export default async function IntegrationsPage() {
  let igAccount = null
  let metaAdsAccount = null
  let youtubeChannel = null

  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const [igRes, metaRes, ytRes] = await Promise.all([
      (supabase as any)
        .from("instagram_accounts")
        .select("id,ig_user_id,username,name,profile_picture_url,followers_count,is_active")
        .eq("is_active", true)
        .maybeSingle(),
      (supabase as any)
        .from("meta_ads_accounts")
        .select("id,meta_account_id,account_name,currency,is_active,status")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
      (supabase as any)
        .from("youtube_channels")
        .select("id,channel_id,channel_title,thumbnail_url,subscribers_count,is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
    ])

    if (igRes.data) {
      igAccount = {
        id: igRes.data.id,
        ig_username: igRes.data.username,
        ig_name: igRes.data.name ?? null,
        ig_profile_picture_url: igRes.data.profile_picture_url ?? null,
        followers_count: igRes.data.followers_count ?? null,
        is_active: igRes.data.is_active,
      }
    }

    if (metaRes.data) metaAdsAccount = metaRes.data
    if (ytRes.data) youtubeChannel = ytRes.data
  } catch {
    // Not authenticated — cards render in disconnected state
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Integraciones"
          description="Conectá tus plataformas para sincronizar datos automáticamente"
        />
      </div>

      <div className="space-y-3">
        <InstagramCard account={igAccount} />
        <MetaAdsCard account={metaAdsAccount} />
        <YouTubeCard channel={youtubeChannel} />
      </div>
    </div>
  )
}
