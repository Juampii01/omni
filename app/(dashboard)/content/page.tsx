import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { ContentClient } from "./content-client"
import { IGAccountHeader } from "@/components/instagram/account-header"
import { IGMediaGrid } from "@/components/instagram/media-grid"
import { IGInsightsChart } from "@/components/instagram/insights-chart"
import { IGConnectButton } from "@/components/instagram/connect-button"
import { ContentTabs } from "./content-tabs"
import { Instagram } from "lucide-react"

export const metadata = { title: "Contenido" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 25

async function getInstagramData() {
  const supabase = await createClient()
  const sb = supabase as any

  const { data: account } = await sb
    .from("instagram_accounts")
    .select("*, integrations(is_active)")
    .eq("is_primary", true)
    .single()

  if (!account || !account.integrations?.is_active) return null

  const { data: media } = await sb
    .from("instagram_media")
    .select(`
      id, ig_media_id, media_type, media_url, thumbnail_url,
      permalink, caption, timestamp,
      instagram_media_insights(
        impressions, reach, likes, comments, shares, saves,
        plays, total_interactions, engagement_rate, snapshotted_at
      )
    `)
    .eq("account_id", account.id)
    .order("timestamp", { ascending: false })
    .limit(12)

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const { data: insights } = await sb
    .from("instagram_account_insights")
    .select("period_date, followers_count, reach, impressions, profile_views")
    .eq("account_id", account.id)
    .gte("period_date", since.toISOString().split("T")[0])
    .order("period_date", { ascending: true })

  return { account, media: media ?? [], insights: insights ?? [] }
}

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const user = await requireAuth()

  const params = await searchParams
  const page   = Math.max(1, parseInt(params.page ?? "1") || 1)

  const supabase = await createClient()
  const sb       = supabase as any

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const [{ data: contentData, count }, igData] = await Promise.all([
    sb.from("content_pieces")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
    getInstagramData(),
  ])

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const calendarTab = (
    <ContentClient
      initialContent={(contentData as any[]) ?? []}
      userId={user.id}
      pagination={{ page, totalCount, totalPages, pageSize: PAGE_SIZE }}
    />
  )

  const instagramTab = igData ? (
    <div className="space-y-6">
      <IGAccountHeader account={igData.account} />
      <IGInsightsChart insights={igData.insights} />
      <IGMediaGrid media={igData.media} />
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
        <Instagram className="w-8 h-8 text-brand" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Conectá tu cuenta de Instagram</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Vinculá tu cuenta Business o Creator para ver métricas, posts y rendimiento en tiempo real.
        </p>
      </div>
      <IGConnectButton />
    </div>
  )

  return (
    <ContentTabs
      calendarTab={calendarTab}
      instagramTab={instagramTab}
      defaultTab={params.tab === "instagram" ? "instagram" : "calendar"}
    />
  )
}
