-- ============================================================
-- Omni — Migration 021 — Chat interno del equipo + Conversaciones por cliente
-- ============================================================
-- Dos features nuevas (ambas lado-equipo por ahora):
--   1) team_messages   — chat interno entre miembros del equipo
--   2) client_messages — hilo de conversación dentro de la ficha de cada cliente
-- RLS calcado del patrón de 018 (auth_is_active / auth_is_manager_plus).
-- Idempotente: se puede re-correr sin romper nada.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1) team_messages — chat interno del equipo
-- ────────────────────────────────────────────────────────────
create table if not exists public.team_messages (
  id          uuid primary key default gen_random_uuid(),
  channel     text not null default 'general',
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now()
);

create index if not exists idx_team_messages_channel_created
  on public.team_messages (channel, created_at);

alter table public.team_messages enable row level security;

drop policy if exists "active profile reads team_messages"      on public.team_messages;
drop policy if exists "active profile sends team_messages"       on public.team_messages;
drop policy if exists "sender or manager+ deletes team_messages" on public.team_messages;

-- SELECT: cualquier profile activo
create policy "active profile reads team_messages"
  on public.team_messages for select to authenticated
  using (public.auth_is_active());

-- INSERT: profile activo, y solo puede mandar como sí mismo
create policy "active profile sends team_messages"
  on public.team_messages for insert to authenticated
  with check (public.auth_is_active() and sender_id = auth.uid());

-- DELETE: el autor del mensaje o manager+
create policy "sender or manager+ deletes team_messages"
  on public.team_messages for delete to authenticated
  using (sender_id = auth.uid() or public.auth_is_manager_plus());

-- ────────────────────────────────────────────────────────────
-- 2) client_messages — conversación con el cliente (lado equipo)
--    direction: outbound = equipo → cliente · inbound = cliente → equipo
-- ────────────────────────────────────────────────────────────
create table if not exists public.client_messages (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id)  on delete cascade,
  sender_id   uuid          references public.profiles(id) on delete set null,
  direction   text not null default 'outbound'
                check (direction in ('outbound','inbound')),
  body        text not null check (length(trim(body)) > 0),
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_client_messages_client_created
  on public.client_messages (client_id, created_at);

alter table public.client_messages enable row level security;

drop policy if exists "active profile reads client_messages"   on public.client_messages;
drop policy if exists "active profile sends client_messages"   on public.client_messages;
drop policy if exists "manager+ deletes client_messages"       on public.client_messages;

-- SELECT/INSERT: cualquier profile activo (mismo modelo que leads/clients)
create policy "active profile reads client_messages"
  on public.client_messages for select to authenticated
  using (public.auth_is_active());

create policy "active profile sends client_messages"
  on public.client_messages for insert to authenticated
  with check (public.auth_is_active());

-- DELETE: manager+
create policy "manager+ deletes client_messages"
  on public.client_messages for delete to authenticated
  using (public.auth_is_manager_plus());

-- ────────────────────────────────────────────────────────────
-- 3) Realtime — agregar ambas tablas a la publicación (idempotente)
-- ────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_messages'
  ) then
    alter publication supabase_realtime add table public.team_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'client_messages'
  ) then
    alter publication supabase_realtime add table public.client_messages;
  end if;
end $$;
