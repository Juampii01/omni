-- Rate limiting para las rutas que llaman a Claude — sin infra existente
-- (sin Redis/Upstash), enfoque simple sobre Postgres: contar hits en la
-- ventana antes de permitir, insertar un hit si se permite. Sin función
-- atómica/advisory lock a propósito — el perfil de concurrencia real
-- (equipos chicos, no bots de alta frecuencia) no lo justifica.
create table public.ai_rate_limit_hits (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  route      text not null,
  created_at timestamptz not null default now()
);

create index idx_ai_rate_limit_hits_lookup on public.ai_rate_limit_hits (client_id, route, created_at desc);

alter table public.ai_rate_limit_hits enable row level security;
create policy "service_role_all" on public.ai_rate_limit_hits for all to service_role using (true) with check (true);
