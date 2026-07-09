-- ============================================================================
-- 0012 — Notificaciones in-app + calendario de eventos
-- ============================================================================
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_notifications_client on public.notifications (client_id, created_at desc);

alter table public.notifications enable row level security;
create policy "service_role_all" on public.notifications for all to service_role using (true) with check (true);
create policy "client_own" on public.notifications for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

alter publication supabase_realtime add table public.notifications;

create table public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  title       text not null,
  description text not null default '',
  event_date  date not null,
  event_type  text not null default 'other' check (event_type in ('reminder', 'meeting', 'deadline', 'other')),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index idx_calendar_events_client on public.calendar_events (client_id, event_date);

alter table public.calendar_events enable row level security;
create policy "service_role_all" on public.calendar_events for all to service_role using (true) with check (true);
create policy "client_own" on public.calendar_events for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

notify pgrst, 'reload schema';
