-- ============================================================================
-- 0019 — Motor de cierre por conversación: máquina de estados con owner
-- (evita superposición IA/humano), 4ta capa de contexto (objeciones), y
-- datos autorizados de pricing/checkout para el enforcement en código de
-- los límites duros.
-- ============================================================================

-- client_mentor_knowledge ya tenía framework/vocabulario/casos para modo
-- feedback — sumamos 'objeciones' como 4ta capa, exclusiva de modo cierre.
alter table public.client_mentor_knowledge
  drop constraint client_mentor_knowledge_layer_check,
  add constraint client_mentor_knowledge_layer_check
    check (layer in ('framework', 'vocabulario', 'casos', 'objeciones'));

-- Datos autorizados para el enforcement en código de los límites duros
-- (nunca se le pide "de confianza" al prompt — se valida la respuesta de
-- la IA contra esto antes de mandarla). authorized_pricing es un array de
-- {label, amount, currency, description} — flexible porque cada negocio
-- puede tener planes/condiciones distintas, sin migrar el schema por cada
-- cliente nuevo.
alter table public.client_config
  add column checkout_link      text,
  add column authorized_pricing jsonb not null default '[]'::jsonb;

-- ============================================================================
-- ig_conversation_state — una fila por "ciclo" de conversación de cierre.
-- Si una conversación se cierra (owner='cerrado') y el lead vuelve a
-- escribir después, se crea una fila NUEVA (no se reabre la vieja) — el
-- historial de mensajes sigue viviendo en instagram_messages, scopeado por
-- conversation_id, así que una fila nueva igual puede leer todo lo anterior
-- para no arrancar sin memoria.
--
-- etapa y owner son dos ejes independientes a propósito:
--   etapa = contenido de la venta (calificando/negociando/cerrado_pendiente_
--           cobro/no_cerro)
--   owner = quién controla el envío (sin_reclamar/ia_activa/escalado_
--           humano/cerrado)
-- No se acoplan — evita que un solo campo tenga que representar dos
-- preguntas distintas ("en qué etapa va la venta" vs "quién puede mandar
-- el próximo mensaje").
-- ============================================================================
create table public.ig_conversation_state (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  conversation_id     uuid not null references public.instagram_conversations(id) on delete cascade,
  instagram_user_id   text not null,

  etapa               text not null default 'calificando'
                         check (etapa in ('calificando', 'negociando', 'cerrado_pendiente_cobro', 'no_cerro')),

  owner               text not null default 'sin_reclamar'
                         check (owner in ('sin_reclamar', 'ia_activa', 'escalado_humano', 'cerrado')),
  owner_changed_at    timestamptz not null default now(),
  -- null = lo cambió el sistema (auto-escalado por límite duro, "no cerró",
  -- o echo de envío manual detectado); con valor = lo cambió un humano vía
  -- el botón de tomar control.
  owner_changed_by    uuid references auth.users(id) on delete set null,

  last_ai_send_at        timestamptz,
  last_lead_message_at   timestamptz,
  closed_at              timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Invariante a nivel de base, no solo de aplicación: como mucho una fila
-- NO cerrada por conversación a la vez. Si hace falta un ciclo nuevo, la
-- fila anterior ya tiene que estar en owner='cerrado'.
create unique index idx_ig_conversation_state_one_open_cycle
  on public.ig_conversation_state (conversation_id)
  where owner <> 'cerrado';

create index idx_ig_conversation_state_client on public.ig_conversation_state(client_id);
create index idx_ig_conversation_state_lead on public.ig_conversation_state(client_id, instagram_user_id);
-- Para el dedupe de prospección fría y el sweep de "no cerró" por 48hs.
create index idx_ig_conversation_state_owner on public.ig_conversation_state(client_id, owner);
create index idx_ig_conversation_state_stale
  on public.ig_conversation_state(owner, last_lead_message_at)
  where owner = 'ia_activa';

drop trigger if exists ig_conversation_state_set_updated_at on public.ig_conversation_state;
create trigger ig_conversation_state_set_updated_at
  before update on public.ig_conversation_state
  for each row execute function public.set_updated_at();

alter table public.ig_conversation_state enable row level security;

create policy "service_role_all" on public.ig_conversation_state for all to service_role using (true) with check (true);
create policy "client_read" on public.ig_conversation_state for select to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

-- ============================================================================
-- ig_own_sent_messages — registro liviano de qué message_id mandó Omni por
-- su cuenta vía la API. Sirve para la detección de envíos manuales: cuando
-- llega un echo por webhook, si su message_id NO está acá, es un mensaje
-- que salió de la cuenta por fuera del sistema (app nativa, Business
-- Suite) — dispara auto-escalado a humano. No es un mecanismo que Meta
-- documente de forma confiable para Instagram (a diferencia de Messenger),
-- así que lo armamos nosotros comparando contra nuestro propio registro en
-- vez de confiar en que el payload del webhook nos diga el origen.
-- ============================================================================
create table public.ig_own_sent_messages (
  ig_message_id text primary key,
  client_id     uuid not null references public.clients(id) on delete cascade,
  conversation_id uuid not null references public.instagram_conversations(id) on delete cascade,
  sent_at       timestamptz not null default now()
);

create index idx_ig_own_sent_messages_conversation on public.ig_own_sent_messages(conversation_id);

alter table public.ig_own_sent_messages enable row level security;
create policy "service_role_all" on public.ig_own_sent_messages for all to service_role using (true) with check (true);

notify pgrst, 'reload schema';
