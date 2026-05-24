"use client"

import Image from "next/image"
import { ExternalLink, Heart, MessageCircle, Share2, Bookmark, Play } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MediaInsight {
  impressions?: number
  reach?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  plays?: number
  total_interactions?: number
  engagement_rate?: number
}

interface MediaItem {
  id: string
  ig_media_id: string
  media_type: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  caption?: string
  timestamp: string
  instagram_media_insights?: MediaInsight[] | null
}

function fmtNum(n?: number) {
  if (!n) return "0"
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
}

function MediaCard({ item }: { item: MediaItem }) {
  const insight = item.instagram_media_insights?.[0]
  const isVideo = item.media_type === "REEL" || item.media_type === "VIDEO"
  const thumb = item.thumbnail_url ?? item.media_url

  return (
    <div className="group relative aspect-square rounded-xl overflow-hidden bg-card border border-border">
      {thumb ? (
        <Image
          src={thumb}
          alt={item.caption?.slice(0, 60) ?? "post"}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <span className="text-2xl">{isVideo ? "🎬" : "🖼️"}</span>
        </div>
      )}

      {/* Type badge */}
      {isVideo && (
        <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
          <Play className="w-3 h-3 text-white fill-white" />
        </div>
      )}

      {/* Overlay on hover */}
      <div className={cn(
        "absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        "flex flex-col justify-end p-3 gap-2"
      )}>
        {insight && (
          <div className="flex flex-wrap gap-2 text-white text-[11px]">
            {insight.likes != null && (
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" /> {fmtNum(insight.likes)}
              </span>
            )}
            {insight.comments != null && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> {fmtNum(insight.comments)}
              </span>
            )}
            {insight.shares != null && (
              <span className="flex items-center gap-1">
                <Share2 className="w-3 h-3" /> {fmtNum(insight.shares)}
              </span>
            )}
            {insight.saves != null && (
              <span className="flex items-center gap-1">
                <Bookmark className="w-3 h-3" /> {fmtNum(insight.saves)}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/70">{fmtDate(item.timestamp)}</span>
          {item.permalink && (
            <a
              href={item.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {insight?.engagement_rate != null && (
          <div className="text-[10px] text-brand font-medium">
            {(insight.engagement_rate * 100).toFixed(2)}% engagement
          </div>
        )}
      </div>
    </div>
  )
}

export function IGMediaGrid({ media }: { media: MediaItem[] }) {
  if (media.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Sin posts sincronizados aún.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Posts recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {media.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
