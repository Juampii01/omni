-- ============================================================
-- Omni — Migration 008 — Rename calendly_api_key → _encrypted
-- ============================================================
-- Renames the plaintext API key column to signal that its value
-- is now stored encrypted (AES-256-GCM via lib/crypto.ts).
-- Any existing plaintext value is cleared — it cannot be
-- re-encrypted without the plaintext key and the new env var.
-- ============================================================

ALTER TABLE public.client_settings
  RENAME COLUMN calendly_api_key TO calendly_api_key_encrypted;

-- Clear any existing plaintext values (cannot recover without re-connecting)
UPDATE public.client_settings
  SET calendly_api_key_encrypted = NULL;
