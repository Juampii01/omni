-- ============================================================================
-- 0020 — try_claim_ai_send: reclamo atómico de envío de IA con exclusión
-- mutua real, también entre dos intentos de IA concurrentes para la misma
-- ronda (no solo IA-vs-humano, que ya cubría el .update() en código).
--
-- El .update() de conversation-ownership.ts revalidaba owner='ia_activa'
-- correctamente contra un humano tomando control a mitad de la generación,
-- pero no contra dos ejecuciones concurrentes de processIncomingLeadMessage
-- para la MISMA fila (webhook reentregado, o dos disparos de after()
-- superpuestos): ninguna de las dos cambia owner, así que las dos pasaban
-- el filtro y las dos mandaban. El fix real es comparar last_ai_send_at
-- contra last_lead_message_at (las dos ya existen desde 0019) — "reclamar
-- solo si todavía no mandé nada desde que llegó este mensaje". PostgREST
-- no puede comparar columna-contra-columna de la misma fila con sus
-- operadores (.lt()/.eq() siempre comparan contra un literal que le
-- pasás vos), así que esa comparación tiene que vivir acá.
--
-- Restringida a service_role a propósito: la función no valida client_id
-- (recibe solo el id de la fila), así que si quedara ejecutable por
-- authenticated reabriría un camino de escritura no scopeado por cliente
-- — justo lo que 0019 cerró al sacar el "client_own" (for all) y dejar
-- ig_conversation_state de solo lectura para el cliente autenticado.
-- ============================================================================
create or replace function public.try_claim_ai_send(p_state_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_claimed boolean;
begin
  update public.ig_conversation_state
  set last_ai_send_at = now()
  where id = p_state_id
    and owner = 'ia_activa'
    and (last_ai_send_at is null or last_ai_send_at < last_lead_message_at)
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

revoke execute on function public.try_claim_ai_send(uuid) from public;
grant execute on function public.try_claim_ai_send(uuid) to service_role;

notify pgrst, 'reload schema';
