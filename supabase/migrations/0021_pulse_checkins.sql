-- ============================================================================
-- 0021 — pulse_checkins: check-in cualitativo recurrente de equipo
-- ============================================================================
-- "Datos de sentimiento" — distinto de las métricas cuantitativas ya
-- existentes (leads, conversión): acá el equipo comparte wins/luchas en sus
-- propias palabras, de forma periódica. Alimenta el chat con herramientas
-- (Fase C) y la acción ai_digest del motor de automatizaciones (Fase D).
create table public.pulse_checkins (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  period_label text,
  wins         text not null default '',
  struggles    text not null default '',
  mood         text check (mood in ('genial', 'bien', 'neutral', 'dificil', 'mal')),
  created_at   timestamptz not null default now()
);

create index idx_pulse_checkins_client on public.pulse_checkins (client_id, created_at desc);

alter table public.pulse_checkins enable row level security;

create policy "service_role_all" on public.pulse_checkins
  for all to service_role using (true) with check (true);

-- client_own solamente — mismo criterio que automation_workflows en 0017:
-- no agregar internal_all sin necesidad real (fue la causa de los 2 fixes
-- de aislamiento arreglados esta sesión). Cualquier rol del propio tenant
-- (incluido "client") puede dejar su check-in.
create policy "client_own" on public.pulse_checkins
  for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

notify pgrst, 'reload schema';
