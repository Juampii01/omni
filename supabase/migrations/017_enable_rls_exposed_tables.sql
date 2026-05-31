-- ============================================================
-- Omni — Migration 017 — Activar RLS en tablas expuestas
-- ============================================================
-- Cierra la exposición de 3 tablas que tenían RLS DESACTIVADA:
--   ai_diagnosis_requests, ai_diagnosis_results  -> lock modelo-Omni
--   landing_config                               -> lectura pública + escritura rol alto
-- Idempotente: re-ejecutable sin error (enable RLS no falla si ya está;
-- cada policy se DROPea IF EXISTS antes de crearse).
-- NO toca datos. NO toca leads. NO toca la unificación KAVAR.
-- ============================================================

begin;

-- ────────────────────────────────────────────────────────────
-- ai_diagnosis_requests  (datos de negocio — sin acceso público)
-- ────────────────────────────────────────────────────────────
alter table public.ai_diagnosis_requests enable row level security;

drop policy if exists "active profile reads ai_diagnosis_requests" on public.ai_diagnosis_requests;
create policy "active profile reads ai_diagnosis_requests"
  on public.ai_diagnosis_requests for select to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_active)
  );

drop policy if exists "high role manages ai_diagnosis_requests" on public.ai_diagnosis_requests;
create policy "high role manages ai_diagnosis_requests"
  on public.ai_diagnosis_requests for all to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_active
              and p.role in ('owner','admin','manager'))
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_active
              and p.role in ('owner','admin','manager'))
  );

-- ────────────────────────────────────────────────────────────
-- ai_diagnosis_results  (datos de negocio — sin acceso público)
-- ────────────────────────────────────────────────────────────
alter table public.ai_diagnosis_results enable row level security;

drop policy if exists "active profile reads ai_diagnosis_results" on public.ai_diagnosis_results;
create policy "active profile reads ai_diagnosis_results"
  on public.ai_diagnosis_results for select to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_active)
  );

drop policy if exists "high role manages ai_diagnosis_results" on public.ai_diagnosis_results;
create policy "high role manages ai_diagnosis_results"
  on public.ai_diagnosis_results for all to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_active
              and p.role in ('owner','admin','manager'))
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_active
              and p.role in ('owner','admin','manager'))
  );

-- ────────────────────────────────────────────────────────────
-- landing_config  (config no sensible de landing/VSL)
-- DECISIÓN: lectura pública (anon) + escritura solo rol alto.
-- Para lockearla del todo, ver bloque alternativo al pie del archivo.
-- ────────────────────────────────────────────────────────────
alter table public.landing_config enable row level security;

drop policy if exists "public reads landing_config" on public.landing_config;
create policy "public reads landing_config"
  on public.landing_config for select to anon, authenticated
  using (true);

drop policy if exists "high role manages landing_config" on public.landing_config;
create policy "high role manages landing_config"
  on public.landing_config for all to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_active
              and p.role in ('owner','admin','manager'))
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_active
              and p.role in ('owner','admin','manager'))
  );

commit;

-- ============================================================
-- ALTERNATIVA: lockear landing_config del todo (sin lectura pública)
-- Solo si confirmás que NINGUNA landing pública la consume con la anon key.
-- Reemplazá la policy "public reads landing_config" por:
--
--   drop policy if exists "public reads landing_config" on public.landing_config;
--   drop policy if exists "active profile reads landing_config" on public.landing_config;
--   create policy "active profile reads landing_config"
--     on public.landing_config for select to authenticated
--     using (exists (select 1 from public.profiles p
--                    where p.id = auth.uid() and p.is_active));
-- ============================================================
