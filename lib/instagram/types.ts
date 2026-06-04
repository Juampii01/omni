// Instagram / Meta Graph API types

export interface IGAccount {
  id: string
  username: string
  name?: string
  biography?: string
  website?: string
  profile_picture_url?: string
  followers_count: number
  follows_count: number
  media_count: number
}

export type IGMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL" | "STORY"

export interface IGMedia {
  id: string
  media_type: IGMediaType
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  caption?: string
  timestamp: string
  children?: { data: Array<{ id: string }> }
  // Métricas devueltas directamente como campos por /me/media (Instagram Login).
  // `views` es el campo v23 para plays de Reels (reemplaza al deprecado video_views).
  like_count?: number
  comments_count?: number
  views?: number
}

export interface IGMediaInsights {
  impressions?: number
  reach?: number
  likes?: number
  comments?: number
  shares?: number
  saved?: number
  plays?: number
  total_interactions?: number
}

export type IGInsightPeriod = "day" | "week" | "days_28"

export interface IGAccountInsightValue {
  value: number
  end_time: string
}

export interface IGAccountInsight {
  name: string
  period: string
  values: IGAccountInsightValue[]
}

export interface FacebookPage {
  id: string
  name: string
  access_token: string
  instagram_business_account?: { id: string }
}

// Stored in DB (integrations table)
export interface StoredIGConnection {
  integration_id: string
  ig_account_id: string // row id from instagram_accounts
  ig_user_id: string
  username: string
  page_access_token_encrypted: string // encrypted page access token
}
