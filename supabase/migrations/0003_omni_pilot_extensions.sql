-- ============================================================================
-- 0003 — Extensiones de schema para portar el piloto de Ann (Smart-Scale)
-- ============================================================================
-- business_name/mentor_name: rellenan el template del system prompt de Omni
-- ("Sos Omni, el agente de mentoría 24/7 de {NOMBRE_DEL_NEGOCIO}...").
alter table public.clients
  add column if not exists business_name text,
  add column if not exists mentor_name text;

-- daily_briefings necesita distinguir el tipo de análisis (antes eran 3
-- filas por día con findings distintos: comunidad, leads, prospección).
alter table public.daily_briefings
  add column if not exists type text not null default 'community'
    check (type in ('community', 'leads', 'prospecting'));

-- El unique (client_id, date) original ya no alcanza — ahora es
-- (client_id, date, type).
alter table public.daily_briefings
  drop constraint if exists daily_briefings_client_id_date_key;
alter table public.daily_briefings
  add constraint daily_briefings_client_date_type_unique unique (client_id, date, type);

-- ============================================================================
-- conversation_analyses — análisis individual de una conversación de IG,
-- bajo demanda. Siempre hay veredicto (sano | en_riesgo | irremontable).
-- ============================================================================
create table public.conversation_analyses (
  conversation_id  uuid primary key references public.instagram_conversations(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete cascade,
  estado           text not null check (estado in ('sano', 'en_riesgo', 'irremontable')),
  situacion        text not null,
  principio        text not null,
  evidencia        text not null,
  accion           text not null,
  severidad        text not null check (severidad in ('alta', 'media', 'baja')),
  analyzed_at      timestamptz not null default now()
);

create index idx_conversation_analyses_client on public.conversation_analyses(client_id);

alter table public.conversation_analyses enable row level security;
create policy "service_role_all" on public.conversation_analyses for all to service_role using (true) with check (true);

-- ============================================================================
-- channel_analyses — análisis individual de un canal de Slack, bajo demanda.
-- Solo 2 estados (no hay "irremontable" para un canal de comunidad).
-- ============================================================================
create table public.channel_analyses (
  channel_id   uuid primary key references public.slack_channels(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  estado       text not null check (estado in ('sano', 'en_riesgo')),
  situacion    text not null,
  principio    text not null,
  evidencia    text not null,
  accion       text not null,
  severidad    text not null check (severidad in ('alta', 'media', 'baja')),
  analyzed_at  timestamptz not null default now()
);

create index idx_channel_analyses_client on public.channel_analyses(client_id);

alter table public.channel_analyses enable row level security;
create policy "service_role_all" on public.channel_analyses for all to service_role using (true) with check (true);

notify pgrst, 'reload schema';
