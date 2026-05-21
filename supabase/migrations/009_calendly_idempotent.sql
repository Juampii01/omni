-- ============================================================
-- Omni — Migration 009 — Calendly integration (idempotente)
-- Seguro de correr desde cualquier estado: 006, 007 o parcial.
-- Reemplaza las migraciones 007 + 008 en un solo paso.
-- ============================================================

DO $$
BEGIN
  -- Si ya existe calendly_api_key (plaintext, de la 007) pero todavía
  -- no existe calendly_api_key_encrypted, renombrarla.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'client_settings'
      AND column_name  = 'calendly_api_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'client_settings'
      AND column_name  = 'calendly_api_key_encrypted'
  ) THEN
    ALTER TABLE public.client_settings
      RENAME COLUMN calendly_api_key TO calendly_api_key_encrypted;
  END IF;
END $$;

-- Agregar columnas si todavía no existen
ALTER TABLE public.client_settings
  ADD COLUMN IF NOT EXISTS calendly_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS calendly_user_uri           text,
  ADD COLUMN IF NOT EXISTS calendly_name               text,
  ADD COLUMN IF NOT EXISTS calendly_email              text;

-- Limpiar cualquier valor en texto plano que haya quedado guardado
UPDATE public.client_settings
  SET calendly_api_key_encrypted = NULL;
