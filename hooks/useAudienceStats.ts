"use client"

import { useState, useEffect } from "react"

export interface AudienceSnapshot {
  date: string
  followers: number
  engagementRate: number
  impressions: number
}

export interface WeekdayPoint {
  label: string
  avgEngagement: number
  count: number
}

export interface ReelStats {
  totalLikes: number
  totalComments: number
  totalViews: number
  reelCount: number
  avgLikes: number
  avgComments: number
  byWeekday: WeekdayPoint[]
}

export interface TopReel {
  id: string
  caption: string
  likesCount: number
  commentsCount: number
  viewsCount: number
  publishedAt: string | null
  url: string
  thumbnailUrl: string | null
}

export interface AudienceStats {
  snapshots: AudienceSnapshot[]
  reelStats: ReelStats
  topReels: TopReel[]
}

export function useAudienceStats(): { data: AudienceStats | null; loading: boolean } {
  const [data, setData] = useState<AudienceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/instagram/audience-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled) {
          setData(json as AudienceStats | null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading }
}
