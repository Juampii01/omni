-- ============================================================
-- Omni — Setup completo (001 + 002 + 003 consolidados)
-- Seguro para ejecutar desde cero en el SQL editor de Supabase
-- ============================================================

-- ─── Limpieza total (orden inverso de dependencias) ──────────
-- Los triggers se eliminan solos con CASCADE en cada DROP TABLE
drop function if exists public.handle_new_user()    cascade;
drop function if exists public.handle_updated_at()  cascade;

drop table if exists public.discovery_responses cascade;
drop table if exists public.discovery_forms      cascade;
drop table if exists public.audit_logs           cascade;
drop table if exists public.integrations         cascade;
drop table if exists public.competitors          cascade;
drop table if exists public.content_pieces       cascade;
drop table if exists public.ai_messages          cascade;
drop table if exists public.ai_conversations     cascade;
drop table if exists public.messages             cascade;
drop table if exists public.channel_members      cascade;
drop table if exists public.channels             cascade;
drop table if exists public.tasks                cascade;
drop table if exists public.lead_activities      cascade;
drop table if exists public.leads                cascade;
drop table if exists public.kpis                 cascade;
drop table if exists public.profiles             cascade;
drop table if exists public.departments          cascade;
drop table if exists public.client_settings      cascade;

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── client_settings (singleton) ────────────────────────────
create table if not exists public.client_settings (
  id                    uuid primary key default gen_random_uuid(),
  business_name         text not null default 'Mi Empresa',
  business_logo_url     text,
  brand_color           text not null default '#236461',
  brand_accent_color    text not null default '#236461',
  timezone              text not null default 'America/Argentina/Buenos_Aires',
  currency              text not null default 'USD',
  fiscal_year_start     integer not null default 1 check (fiscal_year_start between 1 and 12),
  onboarding_completed  boolean not null default false,
  ai_credits_used       integer not null default 0,
  ai_credits_limit      integer not null default 100000,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── departments ─────────────────────────────────────────────
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  color       text not null default '#236461',
  icon        text,
  parent_id   uuid references public.departments(id) on delete set null,
  manager_id  uuid,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text not null unique,
  full_name     text,
  avatar_url    text,
  role          text not null default 'team' check (role in ('owner', 'admin', 'manager', 'team')),
  department_id uuid references public.departments(id) on delete set null,
  is_active     boolean not null default true,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- FK diferida departments.manager_id → profiles (solo si no existe)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'departments_manager_id_fkey'
      and table_name = 'departments'
  ) then
    alter table public.departments
      add constraint departments_manager_id_fkey
      foreign key (manager_id) references public.profiles(id) on delete set null;
  end if;
end $$;

-- ─── kpis ────────────────────────────────────────────────────
create table if not exists public.kpis (
  id              uuid primary key default gen_random_uuid(),
  period_month    date not null,
  category        text not null,
  metric_name     text not null,
  metric_value    numeric(15,2),
  metric_target   numeric(15,2),
  unit            text,
  department_id   uuid references public.departments(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (period_month, category, metric_name, department_id)
);

-- ─── leads ───────────────────────────────────────────────────
create table if not exists public.leads (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  email               text,
  phone               text,
  source              text,
  origin_angle        text,
  stage               text not null default 'new' check (stage in (
    'new', 'qualified', 'meeting_scheduled', 'meeting_done',
    'proposal_sent', 'negotiation', 'won', 'lost'
  )),
  amount              numeric(15,2) not null default 0,
  expected_close_date date,
  closed_at           timestamptz,
  notes               text,
  tags                text[] not null default '{}',
  assigned_to         uuid references public.profiles(id) on delete set null,
  department_id       uuid references public.departments(id) on delete set null,
  metadata            jsonb not null default '{}',
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── lead_activities ─────────────────────────────────────────
create table if not exists public.lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in (
    'note', 'call', 'email', 'meeting', 'stage_change', 'amount_change'
  )),
  description text,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ─── tasks ───────────────────────────────────────────────────
create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  status          text not null default 'todo' check (status in (
    'backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled'
  )),
  priority        text not null default 'medium' check (priority in (
    'low', 'medium', 'high', 'urgent'
  )),
  assigned_to     uuid references public.profiles(id) on delete set null,
  created_by      uuid not null references public.profiles(id) on delete cascade,
  department_id   uuid references public.departments(id) on delete set null,
  related_lead_id uuid references public.leads(id) on delete set null,
  due_date        timestamptz,
  completed_at    timestamptz,
  position        integer not null default 0,
  tags            text[] not null default '{}',
  metadata        jsonb not null default '{}',
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── channels ────────────────────────────────────────────────
create table if not exists public.channels (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  is_private    boolean not null default false,
  department_id uuid references public.departments(id) on delete set null,
  created_by    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create table if not exists public.channel_members (
  channel_id  uuid not null references public.channels(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid references public.channels(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  attachments jsonb not null default '[]',
  reply_to    uuid references public.messages(id) on delete set null,
  edited_at   timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ─── ai_conversations ────────────────────────────────────────
create table if not exists public.ai_conversations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text,
  context_type text not null default 'general' check (context_type in (
    'general', 'crm', 'tasks', 'kpis', 'content', 'analysis'
  )),
  context_id   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.ai_conversations(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'system')),
  content          text not null,
  tokens_used      integer,
  model            text,
  created_at       timestamptz not null default now()
);

-- ─── content_pieces ──────────────────────────────────────────
create table if not exists public.content_pieces (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  format        text check (format in ('reel', 'post', 'story', 'video', 'article', 'thread', 'carousel')),
  platform      text check (platform in ('instagram', 'tiktok', 'youtube', 'twitter', 'linkedin')),
  status        text not null default 'idea' check (status in ('idea', 'draft', 'review', 'scheduled', 'published')),
  scheduled_for timestamptz,
  published_at  timestamptz,
  url           text,
  metrics       jsonb not null default '{}',
  tags          text[] not null default '{}',
  created_by    uuid not null references public.profiles(id) on delete cascade,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── competitors ─────────────────────────────────────────────
create table if not exists public.competitors (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  category         text,
  instagram_handle text,
  tiktok_handle    text,
  youtube_handle   text,
  website_url      text,
  notes            text,
  tags             text[] not null default '{}',
  metadata         jsonb not null default '{}',
  added_by         uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── integrations ────────────────────────────────────────────
create table if not exists public.integrations (
  id                      uuid primary key default gen_random_uuid(),
  provider                text not null,
  account_name            text,
  account_id              text,
  access_token_encrypted  text,
  refresh_token_encrypted text,
  expires_at              timestamptz,
  scopes                  text[],
  metadata                jsonb not null default '{}',
  is_active               boolean not null default true,
  created_by              uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (provider, account_id)
);

-- ─── audit_logs ──────────────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  changes     jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- ─── discovery_forms ─────────────────────────────────────────
create table if not exists public.discovery_forms (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  questions   jsonb not null default '[]',
  is_active   boolean not null default true,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.discovery_responses (
  id               uuid primary key default gen_random_uuid(),
  form_id          uuid not null references public.discovery_forms(id) on delete cascade,
  respondent_email text,
  respondent_name  text,
  answers          jsonb not null default '{}',
  ai_analysis      jsonb,
  completed_at     timestamptz,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- RLS Policies (drop + recreate para idempotencia)
-- ============================================================

-- ─── client_settings ─────────────────────────────────────────
alter table public.client_settings enable row level security;
drop policy if exists "Authenticated users can read settings" on public.client_settings;
drop policy if exists "Owner and admin can update settings" on public.client_settings;
create policy "Authenticated users can read settings"
  on public.client_settings for select using (auth.role() = 'authenticated');
create policy "Owner and admin can update settings"
  on public.client_settings for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );

-- ─── departments ─────────────────────────────────────────────
alter table public.departments enable row level security;
drop policy if exists "Authenticated can read departments" on public.departments;
drop policy if exists "Owner and admin can manage departments" on public.departments;
create policy "Authenticated can read departments"
  on public.departments for select using (auth.role() = 'authenticated');
create policy "Owner and admin can manage departments"
  on public.departments for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );

-- ─── profiles ────────────────────────────────────────────────
alter table public.profiles enable row level security;
drop policy if exists "Users can read all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Owner and admin can update any profile" on public.profiles;
create policy "Users can read all profiles"
  on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile"
  on public.profiles for update using (id = auth.uid());
create policy "Owner and admin can update any profile"
  on public.profiles for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner', 'admin'))
  );

-- ─── kpis ────────────────────────────────────────────────────
alter table public.kpis enable row level security;
drop policy if exists "Authenticated can read kpis" on public.kpis;
drop policy if exists "Manager+ can manage kpis" on public.kpis;
create policy "Authenticated can read kpis"
  on public.kpis for select using (auth.role() = 'authenticated');
create policy "Manager+ can manage kpis"
  on public.kpis for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin', 'manager'))
  );

-- ─── leads ───────────────────────────────────────────────────
alter table public.leads enable row level security;
drop policy if exists "Authenticated can read leads" on public.leads;
drop policy if exists "Authenticated can create leads" on public.leads;
drop policy if exists "Assigned or manager+ can update leads" on public.leads;
drop policy if exists "Only admin+ can delete leads" on public.leads;
create policy "Authenticated can read leads"
  on public.leads for select using (auth.role() = 'authenticated' and deleted_at is null);
create policy "Authenticated can create leads"
  on public.leads for insert with check (auth.role() = 'authenticated');
create policy "Assigned or manager+ can update leads"
  on public.leads for update using (
    assigned_to = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin', 'manager'))
  );
create policy "Only admin+ can delete leads"
  on public.leads for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );

-- ─── lead_activities ─────────────────────────────────────────
alter table public.lead_activities enable row level security;
drop policy if exists "Authenticated can read activities" on public.lead_activities;
drop policy if exists "Authenticated can create activities" on public.lead_activities;
create policy "Authenticated can read activities"
  on public.lead_activities for select using (auth.role() = 'authenticated');
create policy "Authenticated can create activities"
  on public.lead_activities for insert with check (auth.uid() = user_id);

-- ─── tasks ───────────────────────────────────────────────────
alter table public.tasks enable row level security;
drop policy if exists "Authenticated can read tasks" on public.tasks;
drop policy if exists "Authenticated can create tasks" on public.tasks;
drop policy if exists "Assigned or creator or manager+ can update tasks" on public.tasks;
drop policy if exists "Only admin+ can delete tasks" on public.tasks;
create policy "Authenticated can read tasks"
  on public.tasks for select using (auth.role() = 'authenticated' and deleted_at is null);
create policy "Authenticated can create tasks"
  on public.tasks for insert with check (auth.uid() = created_by);
create policy "Assigned or creator or manager+ can update tasks"
  on public.tasks for update using (
    assigned_to = auth.uid()
    or created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin', 'manager'))
  );
create policy "Only admin+ can delete tasks"
  on public.tasks for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );

-- ─── channels ────────────────────────────────────────────────
alter table public.channels enable row level security;
drop policy if exists "Members can read channels" on public.channels;
drop policy if exists "Authenticated can create channels" on public.channels;
create policy "Members can read channels"
  on public.channels for select using (
    not is_private
    or exists (select 1 from public.channel_members where channel_id = channels.id and user_id = auth.uid())
  );
create policy "Authenticated can create channels"
  on public.channels for insert with check (auth.uid() = created_by);

-- ─── channel_members ─────────────────────────────────────────
alter table public.channel_members enable row level security;
drop policy if exists "Members can read channel membership" on public.channel_members;
create policy "Members can read channel membership"
  on public.channel_members for select using (auth.role() = 'authenticated');

-- ─── messages ────────────────────────────────────────────────
alter table public.messages enable row level security;
drop policy if exists "Channel members can read messages" on public.messages;
drop policy if exists "Authenticated can send messages" on public.messages;
drop policy if exists "Author can edit own messages" on public.messages;
create policy "Channel members can read messages"
  on public.messages for select using (
    deleted_at is null and (
      exists (select 1 from public.channels c where c.id = channel_id and not c.is_private)
      or exists (select 1 from public.channel_members cm where cm.channel_id = messages.channel_id and cm.user_id = auth.uid())
    )
  );
create policy "Authenticated can send messages"
  on public.messages for insert with check (auth.uid() = user_id);
create policy "Author can edit own messages"
  on public.messages for update using (user_id = auth.uid());

-- ─── ai_conversations ────────────────────────────────────────
alter table public.ai_conversations enable row level security;
drop policy if exists "Users can read own conversations" on public.ai_conversations;
drop policy if exists "Users can create conversations" on public.ai_conversations;
drop policy if exists "Users can update own conversations" on public.ai_conversations;
create policy "Users can read own conversations"
  on public.ai_conversations for select using (user_id = auth.uid());
create policy "Users can create conversations"
  on public.ai_conversations for insert with check (user_id = auth.uid());
create policy "Users can update own conversations"
  on public.ai_conversations for update using (user_id = auth.uid());

-- ─── ai_messages ─────────────────────────────────────────────
alter table public.ai_messages enable row level security;
drop policy if exists "Users can read messages of own conversations" on public.ai_messages;
drop policy if exists "Users can insert messages to own conversations" on public.ai_messages;
create policy "Users can read messages of own conversations"
  on public.ai_messages for select using (
    exists (select 1 from public.ai_conversations where id = conversation_id and user_id = auth.uid())
  );
create policy "Users can insert messages to own conversations"
  on public.ai_messages for insert with check (
    exists (select 1 from public.ai_conversations where id = conversation_id and user_id = auth.uid())
  );

-- ─── content_pieces ──────────────────────────────────────────
alter table public.content_pieces enable row level security;
drop policy if exists "Authenticated can read content" on public.content_pieces;
drop policy if exists "Authenticated can create content" on public.content_pieces;
drop policy if exists "Creator or manager+ can update content" on public.content_pieces;
create policy "Authenticated can read content"
  on public.content_pieces for select using (auth.role() = 'authenticated');
create policy "Authenticated can create content"
  on public.content_pieces for insert with check (auth.uid() = created_by);
create policy "Creator or manager+ can update content"
  on public.content_pieces for update using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin', 'manager'))
  );

-- ─── competitors ─────────────────────────────────────────────
alter table public.competitors enable row level security;
drop policy if exists "Authenticated can read competitors" on public.competitors;
drop policy if exists "Authenticated can manage competitors" on public.competitors;
create policy "Authenticated can read competitors"
  on public.competitors for select using (auth.role() = 'authenticated');
create policy "Authenticated can manage competitors"
  on public.competitors for all using (auth.role() = 'authenticated');

-- ─── integrations ────────────────────────────────────────────
alter table public.integrations enable row level security;
drop policy if exists "Admin+ can manage integrations" on public.integrations;
create policy "Admin+ can manage integrations"
  on public.integrations for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );

-- ─── audit_logs ──────────────────────────────────────────────
alter table public.audit_logs enable row level security;
drop policy if exists "Admin+ can read audit logs" on public.audit_logs;
drop policy if exists "Service role can insert audit logs" on public.audit_logs;
create policy "Admin+ can read audit logs"
  on public.audit_logs for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );
create policy "Service role can insert audit logs"
  on public.audit_logs for insert with check (true);

-- ─── discovery_forms ─────────────────────────────────────────
alter table public.discovery_forms enable row level security;
drop policy if exists "Authenticated can read forms" on public.discovery_forms;
drop policy if exists "Manager+ can manage forms" on public.discovery_forms;
create policy "Authenticated can read forms"
  on public.discovery_forms for select using (auth.role() = 'authenticated');
create policy "Manager+ can manage forms"
  on public.discovery_forms for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin', 'manager'))
  );

-- ─── discovery_responses ─────────────────────────────────────
alter table public.discovery_responses enable row level security;
drop policy if exists "Manager+ can read responses" on public.discovery_responses;
drop policy if exists "Anyone can submit responses" on public.discovery_responses;
create policy "Manager+ can read responses"
  on public.discovery_responses for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin', 'manager'))
  );
create policy "Anyone can submit responses"
  on public.discovery_responses for insert with check (true);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_leads_stage      on public.leads(stage)             where deleted_at is null;
create index if not exists idx_leads_assigned   on public.leads(assigned_to)       where deleted_at is null;
create index if not exists idx_leads_created    on public.leads(created_at desc)   where deleted_at is null;
create index if not exists idx_leads_department on public.leads(department_id)     where deleted_at is null;
create index if not exists idx_tasks_status     on public.tasks(status)            where deleted_at is null;
create index if not exists idx_tasks_assigned   on public.tasks(assigned_to)       where deleted_at is null;
create index if not exists idx_tasks_created_by on public.tasks(created_by)        where deleted_at is null;
create index if not exists idx_tasks_due_date   on public.tasks(due_date)          where deleted_at is null;
create index if not exists idx_messages_channel on public.messages(channel_id, created_at desc) where deleted_at is null;
create index if not exists idx_kpis_period      on public.kpis(period_month desc);
create index if not exists idx_kpis_category    on public.kpis(category);
create index if not exists idx_ai_conv_user     on public.ai_conversations(user_id, updated_at desc);
create index if not exists idx_ai_msg_conv      on public.ai_messages(conversation_id, created_at asc);
create index if not exists idx_audit_user       on public.audit_logs(user_id, created_at desc);
create index if not exists idx_audit_entity     on public.audit_logs(entity_type, entity_id);
create index if not exists idx_profiles_email   on public.profiles(email);
create index if not exists idx_profiles_role    on public.profiles(role);

-- ============================================================
-- Triggers: updated_at
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.client_settings;
create trigger set_updated_at before update on public.client_settings
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.departments;
create trigger set_updated_at before update on public.departments
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.kpis;
create trigger set_updated_at before update on public.kpis
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.leads;
create trigger set_updated_at before update on public.leads
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.tasks;
create trigger set_updated_at before update on public.tasks
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.ai_conversations;
create trigger set_updated_at before update on public.ai_conversations
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.content_pieces;
create trigger set_updated_at before update on public.content_pieces
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.competitors;
create trigger set_updated_at before update on public.competitors
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.integrations;
create trigger set_updated_at before update on public.integrations
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
