-- ============================================================================
-- 0007 — Documentos: wiki tipo Notion (árbol de páginas, editor BlockNote)
-- ============================================================================
create table public.client_docs_pages (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  parent_id   uuid references public.client_docs_pages(id) on delete cascade,
  title       text not null default 'Sin título',
  icon        text,
  content     jsonb not null default '[]'::jsonb,
  sort_order  integer not null default 0,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_client_docs_pages_client on public.client_docs_pages (client_id, parent_id, sort_order);

drop trigger if exists client_docs_pages_set_updated_at on public.client_docs_pages;
create trigger client_docs_pages_set_updated_at
  before update on public.client_docs_pages
  for each row execute function public.set_updated_at();

alter table public.client_docs_pages enable row level security;

create policy "service_role_all" on public.client_docs_pages
  for all to service_role using (true) with check (true);
create policy "internal_all" on public.client_docs_pages
  for all to authenticated
  using (public.is_internal_staff()) with check (public.is_internal_staff());
create policy "client_own" on public.client_docs_pages
  for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

notify pgrst, 'reload schema';
