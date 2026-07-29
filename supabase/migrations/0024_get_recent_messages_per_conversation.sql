-- Trae los últimos N mensajes por conversación en una sola query, para
-- prospecting-risk-analysis.ts (antes hacía 1 query por conversación, hasta
-- MAX_CONVERSATIONS=60). Un .in() + .limit() plano no sirve acá porque es un
-- "top-N por grupo" — un límite global se puede sesgar hacia conversaciones
-- con timestamps más viejos o más charlatanas, dejando a otras sin mensajes.
create or replace function public.get_recent_messages_per_conversation(
  p_conversation_ids uuid[],
  p_limit_per_conversation int
)
returns table (
  conversation_id uuid,
  sender text,
  body text,
  sent_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select conversation_id, sender, body, sent_at
  from (
    select
      conversation_id, sender, body, sent_at,
      row_number() over (partition by conversation_id order by sent_at desc) as rn
    from public.instagram_messages
    where conversation_id = any(p_conversation_ids)
  ) ranked
  where rn <= p_limit_per_conversation
  order by conversation_id, sent_at asc;
$$;

revoke execute on function public.get_recent_messages_per_conversation(uuid[], int) from public;
grant execute on function public.get_recent_messages_per_conversation(uuid[], int) to service_role;
