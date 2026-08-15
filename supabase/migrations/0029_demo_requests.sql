-- Solicitudes de demo de la landing pública de Omni (prospectos de KAVAR/Omni).
-- NO son leads de un cliente/tenant — por eso tabla propia, no `leads`.
-- Solo el service role (endpoint público /api/demo) escribe; la lectura la hace
-- el platform-admin vía service role. RLS on sin policies = nadie más accede.

create table if not exists public.demo_requests (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text not null,
  company     text,
  message     text,
  source      text not null default 'landing',
  ip          text,
  user_agent  text,
  status      text not null default 'new',
  created_at  timestamptz not null default now()
);

create index if not exists idx_demo_requests_created on public.demo_requests (created_at desc);
create index if not exists idx_demo_requests_ip_created on public.demo_requests (ip, created_at desc);

alter table public.demo_requests enable row level security;
-- Sin policies: solo el service role (que bypassea RLS) puede leer/escribir.
