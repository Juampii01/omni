-- ============================================================
-- Omni — Migration 007 — Add Calendly integration fields
-- ============================================================

ALTER TABLE public.client_settings
  ADD COLUMN IF NOT EXISTS calendly_api_key  text,
  ADD COLUMN IF NOT EXISTS calendly_user_uri text,
  ADD COLUMN IF NOT EXISTS calendly_name     text,
  ADD COLUMN IF NOT EXISTS calendly_email    text;
