-- ============================================================
-- Omni — Migration 011 — Enable Realtime for leads and tasks
-- ============================================================
-- Agrega las tablas a la publicación supabase_realtime para
-- que los hooks de Supabase Realtime puedan suscribirse a
-- postgres_changes.
--
-- Si falla con "already a member of publication", las tablas
-- ya estaban habilitadas — no es un error real.
-- ============================================================

alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.tasks;
