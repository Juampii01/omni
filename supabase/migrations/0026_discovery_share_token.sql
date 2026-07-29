-- Link público para que el prospecto responda la entrevista de descubrimiento
-- él mismo — share_token es el único "credencial" (mismo patrón que
-- automation_workflows.webhook_secret), sin login/cuenta de por medio.
alter table public.discovery_sessions
  add column share_token text unique,
  add column submitted_at timestamptz;
