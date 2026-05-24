-- ============================================================
-- Omni — Migration 014 — Clients v2 + Contacts + IG Publisher
-- ============================================================
-- 1. Columnas adicionales en clients (health_score, slack_channel,
--    industry, parent_client_id, setup_paid + status expandido)
-- 2. Tabla contacts (múltiples contactos por cliente)
-- 3. Tabla instagram_publish_queue (cola de publicación)
-- 4. Tabla instagram_conversations + instagram_messages (DMs)
-- ============================================================

-- ─── clients: columnas nuevas ────────────────────────────────
alter table public.clients
  add column if not exists health_score      integer not null default 80
                                               check (health_score between 0 and 100),
  add column if not exists slack_channel     text,
  add column if not exists industry          text,
  add column if not exists parent_client_id  uuid references public.clients(id) on delete set null,
  add column if not exists setup_paid        numeric(10,2);

-- Expandir el check de status para incluir 'internal_paused' y 'prospect'
-- (drop viejo check + agregar nuevo)
do $$ begin
  alter table public.clients drop constraint if exists clients_status_check;
exception when others then null;
end $$;

alter table public.clients
  add constraint clients_status_check
  check (status in ('active','paused','churned','completed','internal_paused','prospect','at_risk'));

-- ─── contacts ────────────────────────────────────────────────
create table if not exists public.contacts (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  name          text not null,
  email         text,
  phone         text,
  role          text,
  is_primary    boolean not null default false,
  notes         text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_contacts_client
  on public.contacts(client_id);

alter table public.contacts enable row level security;

create policy "authenticated full access"
  on public.contacts for all to authenticated using (true) with check (true);

create or replace trigger set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ─── instagram_publish_queue ──────────────────────────────────
create table if not exists public.instagram_publish_queue (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.instagram_accounts(id) on delete cascade,

  -- Contenido
  media_type      text not null check (media_type in ('IMAGE','VIDEO','REEL','CAROUSEL')),
  caption         text,
  media_urls      text[] not null default '{}',   -- URLs de imágenes/videos (en Storage)
  cover_url       text,                            -- Thumbnail para REEL

  -- Programación
  scheduled_for   timestamptz not null,
  publish_now     boolean not null default false,

  -- Estado del job
  status          text not null default 'pending'
                    check (status in ('pending','processing','published','failed','cancelled')),
  ig_media_id     text,                            -- ID devuelto por Meta tras publicar
  published_at    timestamptz,
  attempt_count   integer not null default 0,
  last_error      text,

  -- Metadatos
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_ig_publish_queue_status_scheduled
  on public.instagram_publish_queue(status, scheduled_for asc);

create index if not exists idx_ig_publish_queue_account
  on public.instagram_publish_queue(account_id);

alter table public.instagram_publish_queue enable row level security;

create policy "authenticated full access"
  on public.instagram_publish_queue for all to authenticated using (true) with check (true);

create or replace trigger set_updated_at
  before update on public.instagram_publish_queue
  for each row execute function public.set_updated_at();

-- ─── instagram_conversations ──────────────────────────────────
create table if not exists public.instagram_conversations (
  id                      uuid primary key default gen_random_uuid(),
  account_id              uuid not null references public.instagram_accounts(id) on delete cascade,

  -- Participante externo
  ig_conversation_id      text not null unique,   -- ID de Meta
  participant_ig_id       text,
  participant_username    text,
  participant_name        text,
  participant_avatar_url  text,

  -- Estado
  last_message_at         timestamptz,
  last_message_preview    text,
  unread_count            integer not null default 0,
  is_archived             boolean not null default false,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_ig_conversations_account_last
  on public.instagram_conversations(account_id, last_message_at desc);

alter table public.instagram_conversations enable row level security;

create policy "authenticated full access"
  on public.instagram_conversations for all to authenticated using (true) with check (true);

create or replace trigger set_updated_at
  before update on public.instagram_conversations
  for each row execute function public.set_updated_at();

-- ─── instagram_messages ───────────────────────────────────────
create table if not exists public.instagram_messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references public.instagram_conversations(id) on delete cascade,

  ig_message_id       text not null unique,   -- ID de Meta
  direction           text not null check (direction in ('inbound','outbound')),
  message_type        text not null default 'text'
                        check (message_type in ('text','image','video','audio','sticker','story_mention','reaction','unsupported')),
  content             text,
  attachments         jsonb not null default '[]',
  reactions           jsonb not null default '[]',

  sent_by_me          boolean not null default false,
  read_at             timestamptz,
  delivered_at        timestamptz,

  received_at         timestamptz not null default now()
);

create index if not exists idx_ig_messages_conversation
  on public.instagram_messages(conversation_id, received_at desc);

create index if not exists idx_ig_messages_ig_id
  on public.instagram_messages(ig_message_id);

alter table public.instagram_messages enable row level security;

create policy "authenticated full access"
  on public.instagram_messages for all to authenticated using (true) with check (true);
