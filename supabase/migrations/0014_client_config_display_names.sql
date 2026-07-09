-- ============================================================================
-- 0014 — client_config: nombre visible de la cuenta conectada
-- ============================================================================
-- ig_account_id/slack_team_id ya identifican la conexión, pero no dan un
-- label humano para la UI de Ajustes ("Conectado como @tal_cosa").
alter table public.client_config
  add column if not exists ig_account_username text,
  add column if not exists slack_team_name text;

notify pgrst, 'reload schema';
