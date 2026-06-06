-- ============================================================
-- Omni — Migration 025 — Policies de tasks limpias (delete + update)
-- ============================================================
-- El soft-delete fallaba: "new row violates row-level security policy for
-- table tasks" → una policy de UPDATE con with-check rechaza setear deleted_at.
-- Se pasa a DELETE real en la app. Acá normalizamos las policies de tasks:
-- se dropean TODAS las de UPDATE/DELETE (cualquier nombre, drift incluido) y se
-- recrean limpias para perfiles activos. NO toca SELECT/INSERT ni policies ALL.
-- ============================================================

alter table public.tasks enable row level security;

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'tasks' and cmd in ('UPDATE', 'DELETE')
  loop
    execute format('drop policy if exists %I on public.tasks', pol.policyname);
  end loop;
end $$;

create policy "active profile updates tasks"
  on public.tasks for update to authenticated
  using (public.auth_is_active())
  with check (public.auth_is_active());

create policy "active profile deletes tasks"
  on public.tasks for delete to authenticated
  using (public.auth_is_active());
