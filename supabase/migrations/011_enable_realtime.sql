-- ============================================================
-- Omni — Migration 011 — Enable Realtime for leads and tasks
-- ============================================================
-- Idempotente: solo agrega la tabla si aún no es miembro de
-- la publicación supabase_realtime.
-- ============================================================

DO $$
BEGIN
  -- leads
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;

  -- tasks
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;
