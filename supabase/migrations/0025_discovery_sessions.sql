-- Sesiones de entrevista de descubrimiento con IA — 100% interno de agencia,
-- nunca client-facing. Sin policy para `authenticated`: el único control de
-- acceso es requirePlatformAdmin() en cada ruta, mismo criterio que
-- instagram_conversations (service_role_all únicamente, sin necesidad real
-- de lectura desde el browser con JWT de cliente).
create table public.discovery_sessions (
  id                  uuid primary key default gen_random_uuid(),
  prospect_name       text not null,
  niche               text,
  status              text not null default 'in_progress' check (status in ('in_progress', 'completed', 'archived')),
  messages            jsonb not null default '[]'::jsonb,
  summary             jsonb,
  converted_client_id uuid references public.clients(id) on delete set null,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_discovery_sessions_status on public.discovery_sessions(status, updated_at desc);

drop trigger if exists discovery_sessions_set_updated_at on public.discovery_sessions;
create trigger discovery_sessions_set_updated_at
  before update on public.discovery_sessions
  for each row execute function public.set_updated_at();

alter table public.discovery_sessions enable row level security;
create policy "service_role_all" on public.discovery_sessions for all to service_role using (true) with check (true);
