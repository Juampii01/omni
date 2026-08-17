-- ============================================================================
-- 0030 — Integración YouTube (OAuth youtube.readonly) en client_config
-- ============================================================================
-- Mismo patrón que Instagram: token cifrado (AES-256-GCM, lib/crypto.ts) por
-- tenant, RLS solo service_role. Google devuelve refresh_token cuando pedimos
-- access_type=offline + prompt=consent → lo guardamos para renovar el
-- access_token sin re-consentimiento del usuario.
alter table public.client_config
  add column if not exists yt_channel_id        text,
  add column if not exists yt_channel_title     text,
  add column if not exists yt_access_token      text,
  add column if not exists yt_refresh_token     text,
  add column if not exists yt_token_expires_at  timestamptz,
  add column if not exists yt_scopes            text not null default '',
  add column if not exists yt_connected_at      timestamptz;

-- oauth_states.provider ahora acepta 'youtube' además de instagram/slack.
alter table public.oauth_states drop constraint if exists oauth_states_provider_check;
alter table public.oauth_states
  add constraint oauth_states_provider_check check (provider in ('instagram', 'slack', 'youtube'));

notify pgrst, 'reload schema';
