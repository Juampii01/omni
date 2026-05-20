-- ============================================================
-- Omni — Migration 001 — Initial Schema
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── client_settings (singleton) ────────────────────────────
create table if not exists public.client_settings (
  id                    uuid primary key default gen_random_uuid(),
  business_name         text not null default 'Mi Empresa',
  business_logo_url     text,
  brand_color           text not null default '#236461',
  brand_accent_color    text not null default '#236461',
  timezone              text not null default 'America/Argentina/Buenos_Aires',
  currency              text not null default 'USD',
  fiscal_year_start     integer not null default 1 check (fiscal_year_start between 1 and 12),
  onboarding_completed  boolean not null default false,
  ai_credits_used       integer not null default 0,
  ai_credits_limit      integer not null default 100000,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── departments ─────────────────────────────────────────────
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  color       text not null default '#236461',
  icon        text,
  parent_id   uuid references public.departments(id) on delete set null,
  manager_id  uuid,  -- fk a profiles, agregada después
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text not null unique,
  full_name     text,
  avatar_url    text,
  role          text not null default 'team' check (role in ('owner', 'admin', 'manager', 'team')),
  department_id uuid references public.departments(id) on delete set null,
  is_active     boolean not null default true,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- fk diferida departments.manager_id → profiles
alter table public.departments
  add constraint departments_manager_id_fkey
  foreign key (manager_id) references public.profiles(id) on delete set null;

-- ─── kpis ────────────────────────────────────────────────────
create table if not exists public.kpis (
  id              uuid primary key default gen_random_uuid(),
  period_month    date not null,
  category        text not null,
  metric_name     text not null,
  metric_value    numeric(15,2),
  metric_target   numeric(15,2),
  unit            text,
  department_id   uuid references public.departments(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (period_month, category, metric_name, department_id)
);

-- ─── leads ───────────────────────────────────────────────────
create table if not exists public.leads (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  email               text,
  phone               text,
  source              text,
  origin_angle        text,
  stage               text not null default 'new' check (stage in (
    'new', 'qualified', 'meeting_scheduled', 'meeting_done',
    'proposal_sent', 'negotiation', 'won', 'lost'
  )),
  amount              numeric(15,2) not null default 0,
  expected_close_date date,
  closed_at           timestamptz,
  notes               text,
  tags                text[] not null default '{}',
  assigned_to         uuid references public.profiles(id) on delete set null,
  department_id       uuid references public.departments(id) on delete set null,
  metadata            jsonb not null default '{}',
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── lead_activities ─────────────────────────────────────────
create table if not exists public.lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in (
    'note', 'call', 'email', 'meeting', 'stage_change', 'amount_change'
  )),
  description text,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ─── tasks ───────────────────────────────────────────────────
create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  status          text not null default 'todo' check (status in (
    'backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled'
  )),
  priority        text not null default 'medium' check (priority in (
    'low', 'medium', 'high', 'urgent'
  )),
  assigned_to     uuid references public.profiles(id) on delete set null,
  created_by      uuid not null references public.profiles(id) on delete cascade,
  department_id   uuid references public.departments(id) on delete set null,
  related_lead_id uuid references public.leads(id) on delete set null,
  due_date        timestamptz,
  completed_at    timestamptz,
  position        integer not null default 0,
  tags            text[] not null default '{}',
  metadata        jsonb not null default '{}',
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── channels ────────────────────────────────────────────────
create table if not exists public.channels (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  is_private    boolean not null default false,
  department_id uuid references public.departments(id) on delete set null,
  created_by    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create table if not exists public.channel_members (
  channel_id  uuid not null references public.channels(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid references public.channels(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  attachments jsonb not null default '[]',
  reply_to    uuid references public.messages(id) on delete set null,
  edited_at   timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ─── ai_conversations ────────────────────────────────────────
create table if not exists public.ai_conversations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text,
  context_type text not null default 'general' check (context_type in (
    'general', 'crm', 'tasks', 'kpis', 'content', 'analysis'
  )),
  context_id   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.ai_conversations(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'system')),
  content          text not null,
  tokens_used      integer,
  model            text,
  created_at       timestamptz not null default now()
);

-- ─── content_pieces ──────────────────────────────────────────
create table if not exists public.content_pieces (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  format        text check (format in ('reel', 'post', 'story', 'video', 'article', 'thread', 'carousel')),
  platform      text check (platform in ('instagram', 'tiktok', 'youtube', 'twitter', 'linkedin')),
  status        text not null default 'idea' check (status in ('idea', 'draft', 'review', 'scheduled', 'published')),
  scheduled_for timestamptz,
  published_at  timestamptz,
  url           text,
  metrics       jsonb not null default '{}',
  tags          text[] not null default '{}',
  created_by    uuid not null references public.profiles(id) on delete cascade,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── competitors ─────────────────────────────────────────────
create table if not exists public.competitors (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  category         text,
  instagram_handle text,
  tiktok_handle    text,
  youtube_handle   text,
  website_url      text,
  notes            text,
  tags             text[] not null default '{}',
  metadata         jsonb not null default '{}',
  added_by         uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── integrations ────────────────────────────────────────────
create table if not exists public.integrations (
  id                     uuid primary key default gen_random_uuid(),
  provider               text not null,
  account_name           text,
  account_id             text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at             timestamptz,
  scopes                 text[],
  metadata               jsonb not null default '{}',
  is_active              boolean not null default true,
  created_by             uuid references public.profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (provider, account_id)
);

-- ─── audit_logs ──────────────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  changes     jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- ─── discovery_forms ─────────────────────────────────────────
create table if not exists public.discovery_forms (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  questions   jsonb not null default '[]',
  is_active   boolean not null default true,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.discovery_responses (
  id               uuid primary key default gen_random_uuid(),
  form_id          uuid not null references public.discovery_forms(id) on delete cascade,
  respondent_email text,
  respondent_name  text,
  answers          jsonb not null default '{}',
  ai_analysis      jsonb,
  completed_at     timestamptz,
  created_at       timestamptz not null default now()
);
