-- ============================================================================
-- 0005 — Admins de plataforma + invitación de equipo + audit log
-- ============================================================================
-- client_id pasa a nullable: el staff interno de Omni (dueño del SaaS) no
-- pertenece a ningún tenant. is_platform_admin es independiente del role
-- por cliente — un usuario puede ser platform admin Y (opcionalmente)
-- pertenecer a un cliente si también lo usa como su propio negocio.
alter table public.profiles
  alter column client_id drop not null;

alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

-- La policy "profiles_select_internal" ya usa is_internal_staff() (owner/
-- admin/team) — un platform admin también necesita poder leer profiles sin
-- client_id (los suyos propios). Reemplazamos por una que cubra ambos casos.
create or replace function public.is_internal_staff()
returns boolean
language sql
security definer
stable
set search_path = 'public', 'pg_catalog'
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role in ('owner', 'admin', 'team') or is_platform_admin)
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = 'public', 'pg_catalog'
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_platform_admin
  );
$$;

revoke execute on function public.is_platform_admin() from anon;
grant execute on function public.is_platform_admin() to authenticated;

-- clients: un platform admin puede leer TODOS los clientes (no solo el
-- propio) — necesario para el panel /admin.
drop policy if exists "internal_read_all_clients" on public.clients;
create policy "internal_read_all_clients" on public.clients
  for select to authenticated
  using (public.is_internal_staff());

-- ============================================================================
-- audit_logs — quién hizo qué, cuándo, sobre qué recurso
-- ============================================================================
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  resource    text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index idx_audit_logs_client on public.audit_logs(client_id, created_at desc);

alter table public.audit_logs enable row level security;
create policy "service_role_all" on public.audit_logs for all to service_role using (true) with check (true);

notify pgrst, 'reload schema';
