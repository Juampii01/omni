-- ============================================================
-- Omni — Migration 020 — Instagram Pro (demografía + ventana DM)
-- ============================================================
-- Agrega lo que falta para la UI "Pro" del PDF de handoff:
--   1) Columnas de demografía (jsonb) en instagram_account_insights
--      para cachear audience_gender_age / country / city + históricos.
--   2) last_user_message_at en instagram_conversations para la
--      ventana de 24h de mensajería de Instagram.
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- NO toca datos. NO toca RLS.
-- ============================================================

BEGIN;

-- ─── 1. Demografía de audiencia (cacheada por día) ───────────
ALTER TABLE public.instagram_account_insights
  ADD COLUMN IF NOT EXISTS gender_age       jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS country          jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS city             jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS follower_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reach_history    jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ─── 2. Ventana de 24h para DMs ──────────────────────────────
-- Marca el último mensaje ENTRANTE (del usuario). La política de Meta
-- solo permite responder dentro de las 24h del último mensaje del usuario.
ALTER TABLE public.instagram_conversations
  ADD COLUMN IF NOT EXISTS last_user_message_at timestamptz;

COMMIT;

-- ─── Verificación (correr por separado) ─────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='instagram_account_insights'
--     AND column_name IN ('gender_age','country','city','follower_history','reach_history');
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='instagram_conversations'
--     AND column_name='last_user_message_at';
