-- ============================================================================
-- 0001_init — Esquema base multi-tenant de Omni
-- ============================================================================
-- Proyecto nuevo, sin data legacy: todo client_id nace NOT NULL. No hay
-- backfill porque no hay filas previas que migrar.
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── clients: un tenant = un negocio que usa Omni ────────────────────────────
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ── profiles: extiende auth.users, cada usuario pertenece a un client_id ────
-- Sin trigger de auto-signup: los usuarios se crean desde una API interna
-- (service_role) que primero crea el auth.users y después el profile,
-- asignando explícitamente client_id y role. Ningún self-signup público.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  role        text not null default 'client' check (role in ('owner','admin','team','client')),
  full_name   text,
  created_at  timestamptz not null default now()
);

create index idx_profiles_client on public.profiles(client_id);

-- Helper SECURITY DEFINER (evita recursión infinita de RLS) — staff interno
-- (owner/admin/team) vs. usuario cliente.
create or replace function public.is_internal_staff()
returns boolean
language sql
security definer
stable
set search_path = 'public', 'pg_catalog'
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin', 'team')
  );
$$;

revoke execute on function public.is_internal_staff() from anon;
grant execute on function public.is_internal_staff() to authenticated;

alter table public.clients  enable row level security;
alter table public.profiles enable row level security;

create policy "service_role_all" on public.clients for all to service_role using (true) with check (true);
create policy "client_read_own" on public.clients for select to authenticated
  using (id in (select p.client_id from public.profiles p where p.id = auth.uid()));
create policy "internal_read_all_clients" on public.clients for select to authenticated
  using (public.is_internal_staff());

create policy "service_role_all" on public.profiles for all to service_role using (true) with check (true);
create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles_select_internal" on public.profiles for select to authenticated
  using (public.is_internal_staff());

-- Igual que en Smart-Scale: ningún update directo vía PostgREST, todo pasa
-- por API routes con service_role (evita escalamiento de privilegios).
revoke update on public.profiles from authenticated;

-- ============================================================================
-- client_config — credenciales de integración (Slack + IG) que lee Omni
-- ============================================================================
-- Nunca se expone al portal del cliente. Solo service_role la toca.
create table public.client_config (
  client_id           uuid primary key references public.clients(id) on delete cascade,
  slack_team_id       text,
  slack_user_id       text,
  slack_access_token  text,
  slack_scopes        text not null default '',
  slack_connected_at  timestamptz,
  ig_account_id       text,
  ig_access_token     text,
  ig_scopes           text not null default '',
  ig_connected_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists client_config_set_updated_at on public.client_config;
create trigger client_config_set_updated_at
  before update on public.client_config
  for each row execute function public.set_updated_at();

alter table public.client_config enable row level security;
create policy "service_role_all" on public.client_config for all to service_role using (true) with check (true);

-- ============================================================================
-- client_mentor_knowledge — las 3 capas del mentor, por cliente
-- ============================================================================
-- framework (principios/metodología) | vocabulario (estilo/tono) | casos
-- (referencias). Nunca se expone al portal — solo la lee el motor de IA
-- (via service_role) al armar el contexto.
create table public.client_mentor_knowledge (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  layer       text not null check (layer in ('framework', 'vocabulario', 'casos')),
  title       text not null,
  content     text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_client_mentor_knowledge_lookup
  on public.client_mentor_knowledge (client_id, layer, is_active, sort_order);

drop trigger if exists client_mentor_knowledge_set_updated_at on public.client_mentor_knowledge;
create trigger client_mentor_knowledge_set_updated_at
  before update on public.client_mentor_knowledge
  for each row execute function public.set_updated_at();

alter table public.client_mentor_knowledge enable row level security;
create policy "service_role_all" on public.client_mentor_knowledge for all to service_role using (true) with check (true);

-- ============================================================================
-- leads — funnel propio de cada cliente
-- ============================================================================
create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  name         text,
  email        text,
  instagram    text,
  source       text,
  status       text not null default 'nuevo',
  rating       integer check (rating between 1 and 5),
  niche        text,
  notes        text,
  raw_payload  jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_leads_client on public.leads(client_id, created_at desc);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
create policy "service_role_all" on public.leads for all to service_role using (true) with check (true);
create policy "internal_all" on public.leads for all to authenticated
  using (public.is_internal_staff()) with check (public.is_internal_staff());

-- ============================================================================
-- slack_channels / slack_messages — lectura de Slack, por cliente
-- ============================================================================
create table public.slack_channels (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  slack_channel_id  text not null,
  name              text not null,
  synced_at         timestamptz not null default now(),
  unique (client_id, slack_channel_id)
);

create table public.slack_messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references public.slack_channels(id) on delete cascade,
  slack_ts    text not null,
  user_name   text,
  body        text,
  posted_at   timestamptz,
  synced_at   timestamptz not null default now(),
  unique (channel_id, slack_ts)
);

create index idx_slack_channels_client on public.slack_channels(client_id);
create index idx_slack_messages_channel on public.slack_messages(channel_id);

alter table public.slack_channels enable row level security;
alter table public.slack_messages enable row level security;
create policy "service_role_all" on public.slack_channels for all to service_role using (true) with check (true);
create policy "service_role_all" on public.slack_messages for all to service_role using (true) with check (true);

-- ============================================================================
-- instagram_conversations / instagram_messages — DMs de IG, por cliente
-- ============================================================================
create table public.instagram_conversations (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients(id) on delete cascade,
  ig_conversation_id    text not null unique,
  participant_username  text,
  participant_ig_id     text,
  last_message_at       timestamptz,
  synced_at             timestamptz not null default now()
);

create table public.instagram_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.instagram_conversations(id) on delete cascade,
  ig_message_id   text not null unique,
  sender          text not null check (sender in ('lead', 'client')),
  body            text,
  sent_at         timestamptz,
  synced_at       timestamptz not null default now()
);

create index idx_instagram_conversations_client on public.instagram_conversations(client_id);
create index idx_instagram_messages_conversation on public.instagram_messages(conversation_id);

alter table public.instagram_conversations enable row level security;
alter table public.instagram_messages enable row level security;
create policy "service_role_all" on public.instagram_conversations for all to service_role using (true) with check (true);
create policy "service_role_all" on public.instagram_messages for all to service_role using (true) with check (true);

-- ============================================================================
-- chat_conversations — sesiones de chat con el mentor de IA, por cliente
-- ============================================================================
create table public.chat_conversations (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  title       text not null default 'Nueva conversación',
  messages    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_chat_conversations_client on public.chat_conversations(client_id);

drop trigger if exists chat_conversations_set_updated_at on public.chat_conversations;
create trigger chat_conversations_set_updated_at
  before update on public.chat_conversations
  for each row execute function public.set_updated_at();

alter table public.chat_conversations enable row level security;
create policy "service_role_all" on public.chat_conversations for all to service_role using (true) with check (true);
create policy "client_own" on public.chat_conversations for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

-- ============================================================================
-- daily_briefings — resumen diario automático del cron, por cliente
-- ============================================================================
create table public.daily_briefings (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  date               date not null default current_date,
  findings           jsonb not null default '[]'::jsonb,
  messages_analyzed  integer not null default 0,
  created_at         timestamptz not null default now(),
  unique (client_id, date)
);

alter table public.daily_briefings enable row level security;
create policy "service_role_all" on public.daily_briefings for all to service_role using (true) with check (true);
create policy "client_own" on public.daily_briefings for select to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

notify pgrst, 'reload schema';
