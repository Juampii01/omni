-- ============================================================
-- Omni — Migration 024 — Normalizar la policy de UPDATE de tasks
-- ============================================================
-- El soft-delete de tareas (update deleted_at) fallaba en producción
-- ("No se pudo eliminar"). Se deja una policy de UPDATE limpia: cualquier
-- profile activo puede actualizar (incluye setear deleted_at). Idempotente.
-- ============================================================

alter table public.tasks enable row level security;

drop policy if exists "Authenticated can update tasks"                 on public.tasks;
drop policy if exists "Assigned or creator or manager+ can update tasks" on public.tasks;
drop policy if exists "active profile updates tasks"                   on public.tasks;

create policy "active profile updates tasks"
  on public.tasks for update to authenticated
  using (public.auth_is_active())
  with check (public.auth_is_active());
