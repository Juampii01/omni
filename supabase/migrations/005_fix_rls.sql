-- ============================================================
-- Omni — Migration 005 — Fix RLS policies
-- ============================================================
-- Propósito: loosen UPDATE policies para leads y tasks.
-- En una app single-tenant de equipo, cualquier miembro
-- autenticado debe poder actualizar/soft-delete sus registros.
-- ============================================================

-- ─── leads ───────────────────────────────────────────────────

drop policy if exists "Assigned or manager+ can update leads" on public.leads;

create policy "Authenticated can update leads"
  on public.leads for update
  using (auth.role() = 'authenticated');

-- ─── tasks ───────────────────────────────────────────────────

drop policy if exists "Assigned or creator or manager+ can update tasks" on public.tasks;

create policy "Authenticated can update tasks"
  on public.tasks for update
  using (auth.role() = 'authenticated');

-- ─── profiles — allow any profile to INSERT (for trigger fallback) ─

drop policy if exists "Service can insert profiles" on public.profiles;
create policy "Service can insert profiles"
  on public.profiles for insert
  with check (true);

-- ─── discovery_forms — allow read for public (needed for respond page) ─

drop policy if exists "Public can read active forms" on public.discovery_forms;
create policy "Public can read active forms"
  on public.discovery_forms for select
  using (is_active = true);

-- ─── Normalize roles: si hay múltiples 'owner', ────────────────
-- el más antiguo conserva el rol. Los demás pasan a 'admin'
-- (admin tiene acceso completo excepto borrar la org).
-- Es seguro: no borra a nadie, solo baja el nivel del rol.

do $$
begin
  if (select count(*) from public.profiles where role = 'owner') > 1 then
    update public.profiles
    set role = 'admin'
    where role = 'owner'
      and id not in (
        select id from public.profiles
        where role = 'owner'
        order by created_at asc
        limit 1
      );
  end if;
end $$;
