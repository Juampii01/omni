-- ============================================================
-- Migration 015: Meta Ads + YouTube integration tables
-- ============================================================

-- ── META ADS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meta_ads_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meta_account_id       TEXT NOT NULL UNIQUE,       -- act_xxxxxxxxxxxxxxx
  account_name          TEXT NOT NULL,
  currency              TEXT,
  timezone_name         TEXT,
  access_token_enc      TEXT NOT NULL,              -- AES-256-GCM via lib/crypto
  token_expires_at      TIMESTAMPTZ,
  connected_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at        TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','disconnected','error'))
);

ALTER TABLE public.meta_ads_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_ads_accounts: owner only"
  ON public.meta_ads_accounts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_meta_ads_accounts_user ON public.meta_ads_accounts(user_id);

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meta_ads_campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID NOT NULL REFERENCES public.meta_ads_accounts(id) ON DELETE CASCADE,
  meta_campaign_id  TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  objective         TEXT,
  status            TEXT NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('ACTIVE','PAUSED','DELETED','ARCHIVED')),
  daily_budget      NUMERIC(12,2),
  lifetime_budget   NUMERIC(12,2),
  start_time        TIMESTAMPTZ,
  stop_time         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meta_ads_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_ads_campaigns: via account owner"
  ON public.meta_ads_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meta_ads_accounts a
      WHERE a.id = account_id AND a.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_account ON public.meta_ads_campaigns(account_id);

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meta_ads_insights (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     UUID NOT NULL REFERENCES public.meta_ads_accounts(id) ON DELETE CASCADE,
  campaign_id    UUID REFERENCES public.meta_ads_campaigns(id) ON DELETE SET NULL,
  date           DATE NOT NULL,
  spend          NUMERIC(12,2),
  impressions    BIGINT,
  clicks         BIGINT,
  ctr            NUMERIC(8,4),
  cpc            NUMERIC(10,4),
  cpm            NUMERIC(10,4),
  cpl            NUMERIC(10,4),
  roas           NUMERIC(10,4),
  conversions    INT,
  reach          BIGINT,
  frequency      NUMERIC(8,4),
  raw_data       JSONB,
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, date)
);

ALTER TABLE public.meta_ads_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_ads_insights: via account owner"
  ON public.meta_ads_insights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meta_ads_accounts a
      WHERE a.id = account_id AND a.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_meta_insights_date   ON public.meta_ads_insights(date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_insights_account ON public.meta_ads_insights(account_id);

-- ── YOUTUBE ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.youtube_channels (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id              TEXT NOT NULL UNIQUE,
  channel_title           TEXT NOT NULL,
  custom_url              TEXT,
  description             TEXT,
  thumbnail_url           TEXT,
  access_token_enc        TEXT NOT NULL,        -- AES-256-GCM
  refresh_token_enc       TEXT,                 -- AES-256-GCM (long-lived)
  token_expires_at        TIMESTAMPTZ,
  subscribers_count       BIGINT,
  video_count             INT,
  total_views             BIGINT,
  connected_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at          TIMESTAMPTZ,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "youtube_channels: owner only"
  ON public.youtube_channels
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_user ON public.youtube_channels(user_id);

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.youtube_videos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id        UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
  video_id          TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT,
  thumbnail_url     TEXT,
  published_at      TIMESTAMPTZ,
  duration_seconds  INT,
  views             BIGINT DEFAULT 0,
  likes             INT DEFAULT 0,
  comments          INT DEFAULT 0,
  watch_time_minutes BIGINT DEFAULT 0,
  avg_view_duration  INT DEFAULT 0,             -- seconds
  avg_view_percentage NUMERIC(5,2) DEFAULT 0,
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "youtube_videos: via channel owner"
  ON public.youtube_videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.youtube_channels c
      WHERE c.id = channel_id AND c.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_youtube_videos_channel  ON public.youtube_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_published ON public.youtube_videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_views     ON public.youtube_videos(views DESC);
