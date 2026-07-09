-- ============================================================================
-- 0009 — Tareas (Kanban nivel ClickUp), multi-tenant
-- ============================================================================
create table public.kanban_tasks (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  title       text not null,
  description text not null default '',
  due_date    date,
  label_text  text not null default '',
  label_color text not null default '',
  column_id   text not null default 'por-hacer',
  priority    text not null default 'con-tiempo' check (priority in ('urgente', 'importante', 'con-tiempo')),
  subtasks    jsonb not null default '[]'::jsonb,
  blocked     boolean not null default false,
  assignees   text[] not null default '{}',
  "order"     integer not null default 0,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_kanban_tasks_client_column on public.kanban_tasks (client_id, column_id, "order");

drop trigger if exists kanban_tasks_set_updated_at on public.kanban_tasks;
create trigger kanban_tasks_set_updated_at
  before update on public.kanban_tasks
  for each row execute function public.set_updated_at();

create table public.kanban_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.kanban_tasks(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  author_id  uuid references auth.users(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);

create index idx_kanban_comments_task on public.kanban_comments (task_id, created_at);

create table public.kanban_attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.kanban_tasks(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  file_name   text not null,
  file_path   text not null,
  size_bytes  integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index idx_kanban_attachments_task on public.kanban_attachments (task_id, created_at);

alter table public.kanban_tasks enable row level security;
alter table public.kanban_comments enable row level security;
alter table public.kanban_attachments enable row level security;

create policy "service_role_all" on public.kanban_tasks for all to service_role using (true) with check (true);
create policy "client_own" on public.kanban_tasks for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

create policy "service_role_all" on public.kanban_comments for all to service_role using (true) with check (true);
create policy "client_own" on public.kanban_comments for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

create policy "service_role_all" on public.kanban_attachments for all to service_role using (true) with check (true);
create policy "client_own" on public.kanban_attachments for all to authenticated
  using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))
  with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()));

-- Realtime: habilitar postgres_changes para estas 3 tablas (el filtro por
-- client_id se aplica del lado del cliente al suscribirse al canal).
alter publication supabase_realtime add table public.kanban_tasks;
alter publication supabase_realtime add table public.kanban_comments;

notify pgrst, 'reload schema';
