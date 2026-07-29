-- Contexto previo que la agencia ya conoce sobre el prospecto (ej. lo
-- hablado por fuera de la herramienta) — se inyecta en el system prompt de
-- la entrevista y, si la sesión todavía no tiene mensajes, genera el
-- mensaje de apertura para que el prospecto no arranque en frío.
alter table public.discovery_sessions add column prior_context text;
