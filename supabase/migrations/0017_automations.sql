-- ============================================================================
-- 0017 — Motor de automatizaciones tipo Zapier: workflows, steps, cola de
-- eventos con reintentos, y runs para debug.
-- ============================================================================
create table public.automation_workflows (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  name           text not null,
  trigger_type   text not null check (trigger_type in ('briefing.finding', 'task.column_changed', 'webhook.incoming')),
  trigger_config jsonb not null default '{}'::jsonb,
  webhook_secret text,
  is_active      boolean not null default true,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_automation_workflows_client on public.automation_workflows(client_id);
create index idx_automation_workflows_trigger on public.automation_workflows(trigger_type, is_active);

drop trigger if exists automation_workflows_set_updated_at on public.automation_workflows;
create trigger automation_workflows_set_updated_at
  before update on public.automation_workflows
  for each row execute function public.set_updated_at();

create table public.automation_steps (
  id            uuid primary key default gen_random_uuid(),
  workflow_id   uuid not null references public.automation_workflows(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  step_order    integer not null default 0,
  action_type   text not null check (action_type in ('create_task', 'send_notification', 'call_webhook')),
  action_config jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index idx_automation_steps_workflow on public.automation_steps(workflow_id, step_order);

-- Cola async con reintentos — mismo espíritu que el cron diario, pero a
-- nivel evento individual en vez de "corré esto una vez por día".
create table public.automation_events (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  event_type      text not null,
  payload         jsonb not null default '{}'::jsonb,
  status          text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts        integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index idx_automation_events_pending on public.automation_events(status, next_attempt_at);

create table public.automation_runs (
  id           uuid primary key default gen_random_uuid(),
  workflow_id  uuid not null references public.automation_workflows(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  event_id     uuid references public.automation_events(id) on delete set null,
  status       text not null check (status in ('success', 'error')),
  log          jsonb not null default '[]'::jsonb,
  triggered_at timestamptz not null default now()
);

create index idx_automation_runs_workflow on public.automation_runs(workflow_id, triggered_at desc);

alter table public.automation_workflows enable row level security;
alter table public.automation_steps     enable row level security;
alter table public.automation_events    enable row level security;
alter table public.automation_runs      enable row level security;

-- client_own (sin internal_all — aprendizaje directo de la Fase 0: no
-- agregar esa policy salvo que haga falta de verdad, y si hace falta, con
-- is_platform_admin(), nunca is_internal_staff() a secas).
create policy "service_role_all" on public.automation_workflows for all to service_role using (true) with check (true);
create policy "client_own" on public.automation_workflows for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

create policy "service_role_all" on public.automation_steps for all to service_role using (true) with check (true);
create policy "client_own" on public.automation_steps for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

create policy "service_role_all" on public.automation_runs for all to service_role using (true) with check (true);
create policy "client_own" on public.automation_runs for select to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

-- automation_events es la cola interna — nunca se expone directo al cliente.
create policy "service_role_all" on public.automation_events for all to service_role using (true) with check (true);

notify pgrst, 'reload schema';
