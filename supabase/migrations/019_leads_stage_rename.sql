-- ============================================================
-- Omni — Migration 019 — Renombrar etapas del pipeline de leads
-- ============================================================
-- Cambia el CHECK constraint de leads.stage para reflejar
-- el vocabulario real del proceso de ventas de KAVAR/Omni.
--
-- MAPEO viejo → nuevo:
--   meeting_scheduled → call_scheduled
--   meeting_done      → call_done
--   negotiation       → proposal_sent  (etapa más cercana)
--
-- Nuevas etapas añadidas:
--   contacted  (entre new y qualified)
--
-- Etapas que se mantienen igual:
--   new, qualified, proposal_sent, won, lost
--
-- Idempotente: re-ejecutable sin error.
-- ============================================================

BEGIN;

-- ─── Paso 1: bajar el constraint viejo PRIMERO ───────────────
-- (Los UPDATE del paso 2 usan valores nuevos que el constraint
--  viejo no conoce → hay que dropearlo antes de tocar los datos)
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_stage_check;

-- ─── Paso 2: migrar filas con stages viejos ──────────────────
-- (Sin constraint activo, los nuevos valores se escriben bien)
UPDATE public.leads
SET stage = 'call_scheduled', updated_at = now()
WHERE stage = 'meeting_scheduled';

UPDATE public.leads
SET stage = 'call_done', updated_at = now()
WHERE stage = 'meeting_done';

UPDATE public.leads
SET stage = 'proposal_sent', updated_at = now()
WHERE stage = 'negotiation';

-- ─── Paso 3: agregar el CHECK constraint nuevo ───────────────
ALTER TABLE public.leads
  ADD CONSTRAINT leads_stage_check CHECK (stage IN (
    'new',
    'contacted',
    'qualified',
    'call_scheduled',
    'call_done',
    'proposal_sent',
    'won',
    'lost'
  ));

-- ─── Paso 3: actualizar el default ───────────────────────────
ALTER TABLE public.leads
  ALTER COLUMN stage SET DEFAULT 'new';

COMMIT;

-- ─── Verificación (correr por separado) ─────────────────────
-- SELECT stage, count(*) FROM public.leads GROUP BY stage ORDER BY stage;
-- Esperado: solo filas con los nuevos stage names (o sin filas si todo es demo archivado).
