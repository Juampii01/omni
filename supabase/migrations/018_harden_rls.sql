-- ============================================================
-- Omni — Migration 018 — Endurecer RLS (cerrar "cualquier autenticado")
-- ============================================================
-- Decisión de producto (single-tenant):
--   * TODOS los usuarios con profile ACTIVO ven todo (no se segmenta).
--   * Solo owner/admin/manager editan y borran leads.
-- Esta migración:
--   1) Crea helpers SECURITY DEFINER para chequear "profile activo" y
--      "manager+" sin recursión de RLS y de forma performante.
--   2) Endurece las policies de leads (SELECT/INSERT = profile activo;
--      UPDATE/DELETE = manager+).
--   3) Reemplaza las policies using(true) de spec_v1 por "profile activo"
--      (mantiene "todos ven y escriben todo", solo cierra el "cualquiera entra").
-- NO toca: instagram_accounts, meta_ads_accounts, youtube_channels
--   (ya aíslan por user_id), ni las tablas KAVAR (client_id=auth.uid()),
--   ni las tablas de la migración 017.
-- Idempotente: re-ejecutable (create or replace / drop policy if exists).
-- ============================================================

begin;

-- ────────────────────────────────────────────────────────────
-- 1) Helpers (SECURITY DEFINER → leen profiles sin gatillar RLS)
-- ────────────────────────────────────────────────────────────
create or replace function public.auth_is_active()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;

create or replace function public.auth_is_manager_plus()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
      and p.role in ('owner','admin','manager')
  );
$$;

revoke all on function public.auth_is_active()       from public;
revoke all on function public.auth_is_manager_plus() from public;
grant execute on function public.auth_is_active()       to authenticated;
grant execute on function public.auth_is_manager_plus() to authenticated;

-- ────────────────────────────────────────────────────────────
-- 2) leads — endurecer
--    SELECT/INSERT: profile activo · UPDATE/DELETE: manager+
-- ────────────────────────────────────────────────────────────
alter table public.leads enable row level security;

-- policies viejas
drop policy if exists "Authenticated can read leads"            on public.leads;
drop policy if exists "Authenticated can create leads"          on public.leads;
drop policy if exists "Assigned or manager+ can update leads"   on public.leads;
drop policy if exists "Only admin+ can delete leads"            on public.leads;
-- nombres nuevos (idempotencia si se re-corre)
drop policy if exists "active profile reads leads"   on public.leads;
drop policy if exists "active profile creates leads" on public.leads;
drop policy if exists "manager+ updates leads"       on public.leads;
drop policy if exists "manager+ deletes leads"       on public.leads;

create policy "active profile reads leads"
  on public.leads for select to authenticated
  using (public.auth_is_active() and deleted_at is null);

create policy "active profile creates leads"
  on public.leads for insert to authenticated
  with check (public.auth_is_active());

create policy "manager+ updates leads"
  on public.leads for update to authenticated
  using (public.auth_is_manager_plus())
  with check (public.auth_is_manager_plus());

create policy "manager+ deletes leads"
  on public.leads for delete to authenticated
  using (public.auth_is_manager_plus());

-- ────────────────────────────────────────────────────────────
-- 3) Tablas spec_v1 con using(true) → "profile activo full access"
--    Mantiene "todos ven y escriben todo" (sin segmentar),
--    solo exige profile activo. NO incluye las *_accounts user-aisladas.
-- ────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tablas text[] := array[
    'ai_diagnoses','automations','automation_executions','business_docs',
    'client_strategies','clients','competitors','competitor_snapshots',
    'contacts','expense_records','revenue_records','research_requests',
    'launches','launch_participants','team_members','manychat_snapshots',
    'meta_ads_snapshots','instagram_account_insights','instagram_comments',
    'instagram_conversations','instagram_media','instagram_media_insights',
    'instagram_messages','instagram_publish_queue'
  ];
begin
  foreach t in array tablas loop
    -- por si alguna no existe en este entorno, no abortar todo
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'skip: tabla public.% no existe', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated full access', t);
    execute format('drop policy if exists %I on public.%I', 'active profile full access', t);
    execute format(
      'create policy %I on public.%I for all to authenticated '
      || 'using (public.auth_is_active()) with check (public.auth_is_active())',
      'active profile full access', t
    );
  end loop;
end $$;

commit;

-- ============================================================
-- NOTAS / cambios de comportamiento a tener en cuenta:
--   * leads UPDATE: un usuario 'team' YA NO puede editar leads (ni los
--     asignados a él). Antes podía si assigned_to = su uid. Ahora solo manager+.
--   * leads DELETE: ahora lo puede manager (antes solo owner/admin).
--   * lead_activities NO se toca: 'team' sigue pudiendo registrar
--     notas/llamadas/actividades (sus policies de la migración 002 siguen).
--   * Un usuario autenticado SIN profile activo (is_active=false) o sin
--     profile pierde acceso de lectura/escritura a todas estas tablas.
-- ============================================================
