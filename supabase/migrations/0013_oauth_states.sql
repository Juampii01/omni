-- ============================================================================
-- 0013 — oauth_states: CSRF state para OAuth de Instagram/Slack, multi-tenant
-- ============================================================================
-- A diferencia del piloto original de Ann (una sola cuenta, el state era
-- solo anti-CSRF), acá cada state debe saber A QUÉ client_id pertenece —
-- el callback lo usa para saber en qué client_config guardar el token.
-- Single-use: se borra al canjear el code. TTL corto (10 min).
create table public.oauth_states (
  state       text primary key,
  client_id   uuid not null references public.clients(id) on delete cascade,
  provider    text not null check (provider in ('instagram', 'slack')),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index idx_oauth_states_expires on public.oauth_states(expires_at);

alter table public.oauth_states enable row level security;
create policy "service_role_all" on public.oauth_states for all to service_role using (true) with check (true);

notify pgrst, 'reload schema';
