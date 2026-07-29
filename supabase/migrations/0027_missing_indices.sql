-- Índices faltantes en 3 rutas calientes identificadas en la auditoría de
-- performance: búsqueda de conversación por participante (webhook de
-- Instagram), orden de mensajes por conversación, y el filtro de 3 columnas
-- que usa el motor de automatizaciones en cada evento procesado.
create index idx_instagram_conversations_client_participant on public.instagram_conversations(client_id, participant_ig_id);
create index idx_instagram_messages_conversation_sent_at on public.instagram_messages(conversation_id, sent_at);
create index idx_automation_workflows_client_trigger_active on public.automation_workflows(client_id, trigger_type, is_active);
