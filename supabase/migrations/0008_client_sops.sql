-- ============================================================================
-- 0008 — SOPs: procedimientos operativos estructurados por cliente
-- ============================================================================
create table public.client_sops (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  title        text not null,
  description  text,
  frequency    text,
  tags         text[] not null default '{}',
  steps        jsonb not null default '[]'::jsonb,
  templates    jsonb not null default '[]'::jsonb,
  ai_generated boolean not null default false,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_client_sops_client on public.client_sops (client_id, created_at desc);
create index idx_client_sops_tags on public.client_sops using gin (tags);

drop trigger if exists client_sops_set_updated_at on public.client_sops;
create trigger client_sops_set_updated_at
  before update on public.client_sops
  for each row execute function public.set_updated_at();

alter table public.client_sops enable row level security;

create policy "service_role_all" on public.client_sops
  for all to service_role using (true) with check (true);
create policy "internal_all" on public.client_sops
  for all to authenticated
  using (public.is_internal_staff()) with check (public.is_internal_staff());
create policy "client_own" on public.client_sops
  for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

notify pgrst, 'reload schema';
