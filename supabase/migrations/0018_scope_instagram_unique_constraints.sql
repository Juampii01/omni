-- instagram_conversations/instagram_messages tenían unique global en
-- ig_conversation_id / ig_message_id (a diferencia de slack_channels/
-- slack_messages, que desde el día uno usan unique compuesto). Hoy no es
-- explotable (los ids vienen de Meta, no los elige el cliente), pero es
-- una garantía de aislamiento que debería vivir en la constraint de la
-- base, no en el supuesto de que Meta nunca va a repetir un id entre
-- cuentas distintas. Confirmado sin colisiones existentes antes de aplicar.

alter table public.instagram_conversations
  drop constraint instagram_conversations_ig_conversation_id_key,
  add constraint instagram_conversations_client_ig_conversation_id_key
    unique (client_id, ig_conversation_id);

alter table public.instagram_messages
  drop constraint instagram_messages_ig_message_id_key,
  add constraint instagram_messages_conversation_ig_message_id_key
    unique (conversation_id, ig_message_id);
