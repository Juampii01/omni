-- ============================================================================
-- 0015 — Resumen nocturno de conversaciones sin responder (Instagram por
-- ahora; Slack se suma con el mismo patrón cuando esa integración exista).
-- ============================================================================
-- last_message_sender evita tener que hacer un query aparte por conversación
-- para saber quién habló último — se actualiza en cada sync.
alter table public.instagram_conversations
  add column if not exists last_message_sender text check (last_message_sender in ('lead', 'client')),
  add column if not exists last_message_preview text;

alter table public.daily_briefings
  drop constraint if exists daily_briefings_type_check;
alter table public.daily_briefings
  add constraint daily_briefings_type_check
    check (type in ('community', 'leads', 'prospecting', 'unanswered'));

notify pgrst, 'reload schema';
