-- ============================================================
-- Omni — Migration 003 — Indexes
-- ============================================================

-- leads
create index if not exists idx_leads_stage      on public.leads(stage)       where deleted_at is null;
create index if not exists idx_leads_assigned   on public.leads(assigned_to) where deleted_at is null;
create index if not exists idx_leads_created    on public.leads(created_at desc) where deleted_at is null;
create index if not exists idx_leads_department on public.leads(department_id) where deleted_at is null;

-- tasks
create index if not exists idx_tasks_status     on public.tasks(status)       where deleted_at is null;
create index if not exists idx_tasks_assigned   on public.tasks(assigned_to)  where deleted_at is null;
create index if not exists idx_tasks_created_by on public.tasks(created_by)   where deleted_at is null;
create index if not exists idx_tasks_due_date   on public.tasks(due_date)     where deleted_at is null;

-- messages
create index if not exists idx_messages_channel on public.messages(channel_id, created_at desc) where deleted_at is null;

-- kpis
create index if not exists idx_kpis_period      on public.kpis(period_month desc);
create index if not exists idx_kpis_category    on public.kpis(category);

-- ai
create index if not exists idx_ai_conv_user     on public.ai_conversations(user_id, updated_at desc);
create index if not exists idx_ai_msg_conv      on public.ai_messages(conversation_id, created_at asc);

-- audit
create index if not exists idx_audit_user       on public.audit_logs(user_id, created_at desc);
create index if not exists idx_audit_entity     on public.audit_logs(entity_type, entity_id);

-- profiles
create index if not exists idx_profiles_email   on public.profiles(email);
create index if not exists idx_profiles_role    on public.profiles(role);

-- ─── Triggers: updated_at ────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at before update on public.client_settings
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at before update on public.departments
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at before update on public.kpis
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at before update on public.leads
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at before update on public.tasks
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at before update on public.ai_conversations
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at before update on public.content_pieces
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at before update on public.competitors
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at before update on public.integrations
  for each row execute function public.handle_updated_at();

-- ─── Trigger: auto-create profile on signup ──────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
