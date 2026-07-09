-- ============================================================================
-- 0006 — Context Room: perfil de negocio del cliente (7 tabs)
-- ============================================================================
-- Distinto de client_mentor_knowledge (que es el CRITERIO del mentor).
-- Esto es información de negocio (nicho, cliente ideal, números) que se
-- inyecta en los prompts de generación de contenido para personalizar
-- ideas/guiones, sin mezclarse con las 3 capas de criterio.
create table public.client_business_context (
  client_id   uuid primary key references public.clients(id) on delete cascade,
  context     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

drop trigger if exists client_business_context_set_updated_at on public.client_business_context;
create trigger client_business_context_set_updated_at
  before update on public.client_business_context
  for each row execute function public.set_updated_at();

alter table public.client_business_context enable row level security;

create policy "service_role_all" on public.client_business_context
  for all to service_role using (true) with check (true);
create policy "internal_all" on public.client_business_context
  for all to authenticated
  using (public.is_internal_staff()) with check (public.is_internal_staff());
create policy "client_own" on public.client_business_context
  for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

notify pgrst, 'reload schema';
