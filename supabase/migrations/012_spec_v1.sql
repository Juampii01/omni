-- ============================================================
-- Omni — Migration 012 — Spec v1.0 Full Schema
-- ============================================================
-- 22 new tables covering: Instagram API, Clients CRM,
-- Finance, Meta Ads, Manychat, Business Docs, Research,
-- AI outputs, Launches, Automations, Team Members
-- ============================================================

-- ─── demo_mode flag on client_settings ───────────────────────
alter table public.client_settings
  add column if not exists demo_mode boolean not null default false;

-- ============================================================
-- INSTAGRAM (7 tables)
-- ============================================================

-- Linked Instagram Business / Creator accounts
-- Auth tokens live in integrations; this stores IG-specific profile data
create table if not exists public.instagram_accounts (
  id                    uuid primary key default gen_random_uuid(),
  integration_id        uuid references public.integrations(id) on delete cascade,
  ig_user_id            text not null unique,
  username              text not null,
  name                  text,
  biography             text,
  website               text,
  profile_picture_url   text,
  followers_count       integer not null default 0,
  follows_count         integer not null default 0,
  media_count           integer not null default 0,
  is_primary            boolean not null default true,
  last_synced_at        timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- All media objects: IMAGE, VIDEO, CAROUSEL_ALBUM, REEL, STORY
create table if not exists public.instagram_media (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null references public.instagram_accounts(id) on delete cascade,
  ig_media_id         text not null unique,
  media_type          text not null check (media_type in ('IMAGE','VIDEO','CAROUSEL_ALBUM','REEL','STORY')),
  media_url           text,
  thumbnail_url       text,
  permalink           text,
  caption             text,
  timestamp           timestamptz not null,
  is_published        boolean not null default true,
  expires_at          timestamptz,
  children_ids        text[],
  raw                 jsonb not null default '{}',
  created_at          timestamptz not null default now()
);

-- Per-media engagement metrics (updated by cron or webhook)
create table if not exists public.instagram_media_insights (
  id              uuid primary key default gen_random_uuid(),
  media_id        uuid not null references public.instagram_media(id) on delete cascade,
  snapshotted_at  timestamptz not null default now(),
  impressions     integer,
  reach           integer,
  likes           integer,
  comments        integer,
  shares          integer,
  saves           integer,
  plays           integer,
  total_interactions integer,
  engagement_rate numeric(6,4),
  unique (media_id, snapshotted_at)
);

-- Daily account-level metrics (followers, reach, impressions)
create table if not exists public.instagram_account_insights (
  id                    uuid primary key default gen_random_uuid(),
  account_id            uuid not null references public.instagram_accounts(id) on delete cascade,
  period_date           date not null,
  followers_count       integer,
  follows_count         integer,
  impressions           integer,
  reach                 integer,
  profile_views         integer,
  website_clicks        integer,
  email_contacts        integer,
  net_follower_change   integer,
  created_at            timestamptz not null default now(),
  unique (account_id, period_date)
);

-- Comments on media (fetched via Graph API or webhook)
create table if not exists public.instagram_comments (
  id              uuid primary key default gen_random_uuid(),
  media_id        uuid not null references public.instagram_media(id) on delete cascade,
  ig_comment_id   text not null unique,
  ig_user_id      text,
  username        text,
  text            text not null,
  timestamp       timestamptz not null,
  is_hidden       boolean not null default false,
  parent_id       uuid references public.instagram_comments(id) on delete cascade,
  replied_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- Raw webhook events from Meta (for replay / debugging)
create table if not exists public.instagram_webhooks_log (
  id              uuid primary key default gen_random_uuid(),
  received_at     timestamptz not null default now(),
  object_type     text not null,
  entry           jsonb not null,
  processed       boolean not null default false,
  error           text
);

-- ============================================================
-- CLIENTS CRM (1 table)
-- ============================================================

-- Active paying clients (leads convert to clients after closing)
create table if not exists public.clients (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid references public.leads(id) on delete set null,
  full_name           text not null,
  email               text,
  phone               text,
  company             text,
  instagram_handle    text,
  avatar_url          text,
  status              text not null default 'active'
                        check (status in ('active','paused','churned','completed')),
  tier                text not null default 'standard'
                        check (tier in ('standard','premium','vip')),
  monthly_fee         numeric(10,2),
  currency            text not null default 'USD',
  contract_start      date,
  contract_end        date,
  next_renewal        date,
  owner_id            uuid references public.profiles(id) on delete set null,
  notes               text,
  tags                text[] not null default '{}',
  metadata            jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- FINANCE (2 tables)
-- ============================================================

-- Monthly revenue entries (MRR, one-time payments, etc.)
create table if not exists public.revenue_records (
  id              uuid primary key default gen_random_uuid(),
  period_month    date not null,
  client_id       uuid references public.clients(id) on delete set null,
  category        text not null default 'retainer'
                    check (category in ('retainer','one_time','upsell','referral','other')),
  amount          numeric(12,2) not null,
  currency        text not null default 'USD',
  description     text,
  invoice_url     text,
  paid_at         date,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Expense tracking
create table if not exists public.expense_records (
  id              uuid primary key default gen_random_uuid(),
  period_month    date not null,
  category        text not null default 'tools'
                    check (category in ('tools','ads','payroll','contractors','office','other')),
  amount          numeric(12,2) not null,
  currency        text not null default 'USD',
  vendor          text,
  description     text,
  receipt_url     text,
  paid_at         date,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- META ADS (1 table)
-- ============================================================

-- Daily snapshots per campaign / ad set / ad
create table if not exists public.meta_ads_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid references public.instagram_accounts(id) on delete cascade,
  snapshot_date       date not null,
  level               text not null check (level in ('account','campaign','adset','ad')),
  object_id           text not null,
  object_name         text,
  impressions         integer,
  reach               integer,
  clicks              integer,
  spend               numeric(10,2),
  cpm                 numeric(10,4),
  cpc                 numeric(10,4),
  ctr                 numeric(6,4),
  conversions         integer,
  cost_per_conversion numeric(10,2),
  roas                numeric(10,4),
  raw                 jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  unique (snapshot_date, level, object_id)
);

-- ============================================================
-- MANYCHAT (1 table)
-- ============================================================

-- Daily Manychat subscriber & broadcast metrics
create table if not exists public.manychat_snapshots (
  id                      uuid primary key default gen_random_uuid(),
  snapshot_date           date not null unique,
  total_subscribers       integer,
  active_subscribers      integer,
  new_subscribers         integer,
  unsubscribed            integer,
  broadcasts_sent         integer,
  broadcast_open_rate     numeric(6,4),
  automations_triggered   integer,
  created_at              timestamptz not null default now()
);

-- ============================================================
-- BUSINESS DOCS (1 table)
-- ============================================================

-- Docs uploaded for AI analysis (stored in Supabase Storage)
create table if not exists public.business_docs (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  category        text not null default 'general'
                    check (category in ('offer','funnel','copy','sop','report','competitor','other','general')),
  file_url        text not null,
  file_type       text not null,
  file_size_bytes integer,
  summary         text,
  ai_processed    boolean not null default false,
  ai_processed_at timestamptz,
  uploaded_by     uuid references public.profiles(id) on delete set null,
  tags            text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- RESEARCH & INTELLIGENCE (2 tables)
-- ============================================================

-- AI research requests (async jobs)
create table if not exists public.research_requests (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  prompt          text not null,
  status          text not null default 'pending'
                    check (status in ('pending','processing','done','failed')),
  result_markdown text,
  model           text,
  tokens_used     integer,
  requested_by    uuid references public.profiles(id) on delete set null,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Periodic snapshots of competitor social metrics
create table if not exists public.competitor_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  competitor_id       uuid not null references public.competitors(id) on delete cascade,
  snapshot_date       date not null,
  ig_followers        integer,
  ig_following        integer,
  ig_posts            integer,
  ig_avg_likes        numeric(10,2),
  ig_avg_comments     numeric(10,2),
  ig_engagement_rate  numeric(6,4),
  notes               text,
  created_at          timestamptz not null default now(),
  unique (competitor_id, snapshot_date)
);

-- ============================================================
-- AI OUTPUTS (2 tables)
-- ============================================================

-- Structured AI business diagnostic outputs
create table if not exists public.ai_diagnoses (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  type            text not null default 'general'
                    check (type in ('general','offer','funnel','content','finance','team','general')),
  summary         text,
  strengths       text[],
  weaknesses      text[],
  opportunities   text[],
  threats         text[],
  action_items    jsonb not null default '[]',
  model           text,
  tokens_used     integer,
  requested_by    uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- 7 CoachMap strategic outputs per client
create table if not exists public.client_strategies (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid not null references public.clients(id) on delete cascade,
  version                 integer not null default 1,
  prospecting_angles      text,
  communication_angles    text,
  content_calendar        jsonb not null default '{}',
  offer_structure         text,
  sales_approach          text,
  landing_page_copy       text,
  closing_angles          text,
  model                   text,
  tokens_used             integer,
  generated_by            uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ============================================================
-- LAUNCHES (2 tables)
-- ============================================================

create table if not exists public.launches (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  status              text not null default 'planning'
                        check (status in ('planning','active','live','closed','cancelled')),
  start_date          date,
  end_date            date,
  youtube_stream_url  text,
  target_revenue      numeric(12,2),
  actual_revenue      numeric(12,2),
  participant_count   integer not null default 0,
  coupon_code         text,
  coupon_discount_pct numeric(5,2),
  setup_days          jsonb not null default '[]',
  owner_id            uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.launch_participants (
  id              uuid primary key default gen_random_uuid(),
  launch_id       uuid not null references public.launches(id) on delete cascade,
  full_name       text not null,
  email           text,
  phone           text,
  paid            boolean not null default false,
  amount_paid     numeric(10,2),
  coupon_used     text,
  registered_at   timestamptz not null default now(),
  client_id       uuid references public.clients(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- AUTOMATIONS (2 tables)
-- ============================================================

create table if not exists public.automations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  type            text not null default 'webhook'
                    check (type in ('webhook','cron','zapier','n8n','make','ai','other')),
  status          text not null default 'inactive'
                    check (status in ('active','inactive','error','paused')),
  trigger_config  jsonb not null default '{}',
  action_config   jsonb not null default '{}',
  cron_expression text,
  last_run_at     timestamptz,
  last_run_status text,
  run_count       integer not null default 0,
  error_count     integer not null default 0,
  owner_id        uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.automation_executions (
  id              uuid primary key default gen_random_uuid(),
  automation_id   uuid not null references public.automations(id) on delete cascade,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running'
                    check (status in ('running','success','failed','timeout')),
  trigger_payload jsonb,
  result_payload  jsonb,
  error_message   text,
  duration_ms     integer
);

-- ============================================================
-- TEAM MEMBERS (1 table — extends profiles with role details)
-- ============================================================

create table if not exists public.team_members (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid unique references public.profiles(id) on delete cascade,
  title               text,
  bio                 text,
  skills              text[] not null default '{}',
  hourly_rate         numeric(10,2),
  monthly_retainer    numeric(10,2),
  currency            text not null default 'USD',
  contractor          boolean not null default false,
  start_date          date,
  end_date            date,
  calendly_url        text,
  notion_url          text,
  slack_id            text,
  performance_score   numeric(4,2),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_ig_media_account_timestamp
  on public.instagram_media(account_id, timestamp desc);

create index if not exists idx_ig_media_insights_media
  on public.instagram_media_insights(media_id, snapshotted_at desc);

create index if not exists idx_ig_account_insights_account_date
  on public.instagram_account_insights(account_id, period_date desc);

create index if not exists idx_ig_comments_media
  on public.instagram_comments(media_id, timestamp desc);

create index if not exists idx_ig_webhooks_processed
  on public.instagram_webhooks_log(processed, received_at desc);

create index if not exists idx_clients_status
  on public.clients(status);

create index if not exists idx_revenue_period
  on public.revenue_records(period_month desc);

create index if not exists idx_expense_period
  on public.expense_records(period_month desc);

create index if not exists idx_meta_ads_date
  on public.meta_ads_snapshots(snapshot_date desc, level);

create index if not exists idx_research_status
  on public.research_requests(status, created_at desc);

create index if not exists idx_competitor_snapshots_date
  on public.competitor_snapshots(competitor_id, snapshot_date desc);

create index if not exists idx_launches_status
  on public.launches(status, start_date desc);

create index if not exists idx_launch_participants_launch
  on public.launch_participants(launch_id);

create index if not exists idx_automation_executions_automation
  on public.automation_executions(automation_id, started_at desc);

create index if not exists idx_client_strategies_client
  on public.client_strategies(client_id, version desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all new tables
alter table public.instagram_accounts       enable row level security;
alter table public.instagram_media          enable row level security;
alter table public.instagram_media_insights enable row level security;
alter table public.instagram_account_insights enable row level security;
alter table public.instagram_comments       enable row level security;
alter table public.instagram_webhooks_log   enable row level security;
alter table public.clients                  enable row level security;
alter table public.revenue_records          enable row level security;
alter table public.expense_records          enable row level security;
alter table public.meta_ads_snapshots       enable row level security;
alter table public.manychat_snapshots       enable row level security;
alter table public.business_docs            enable row level security;
alter table public.research_requests        enable row level security;
alter table public.competitor_snapshots     enable row level security;
alter table public.ai_diagnoses             enable row level security;
alter table public.client_strategies        enable row level security;
alter table public.launches                 enable row level security;
alter table public.launch_participants      enable row level security;
alter table public.automations              enable row level security;
alter table public.automation_executions    enable row level security;
alter table public.team_members             enable row level security;

-- Policy helper: only authenticated users can access (single-tenant)
-- All data belongs to the single deployment; any logged-in user can read/write.

create policy "authenticated full access"
  on public.instagram_accounts for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.instagram_media for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.instagram_media_insights for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.instagram_account_insights for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.instagram_comments for all to authenticated using (true) with check (true);

-- Webhooks log: service role only for write (validated by API route before insert)
create policy "authenticated read"
  on public.instagram_webhooks_log for select to authenticated using (true);
create policy "service write"
  on public.instagram_webhooks_log for insert to service_role with check (true);

create policy "authenticated full access"
  on public.clients for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.revenue_records for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.expense_records for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.meta_ads_snapshots for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.manychat_snapshots for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.business_docs for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.research_requests for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.competitor_snapshots for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.ai_diagnoses for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.client_strategies for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.launches for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.launch_participants for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.automations for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.automation_executions for all to authenticated using (true) with check (true);

create policy "authenticated full access"
  on public.team_members for all to authenticated using (true) with check (true);

-- ============================================================
-- updated_at triggers (reuse pattern from existing migrations)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.instagram_accounts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.revenue_records
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.expense_records
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.business_docs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.research_requests
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.client_strategies
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.launches
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.automations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.team_members
  for each row execute function public.set_updated_at();
