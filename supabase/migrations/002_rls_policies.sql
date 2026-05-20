-- ============================================================
-- Omni — Migration 002 — RLS Policies
-- ============================================================

-- ─── Helpers ─────────────────────────────────────────────────
-- Inline subquery para verificar rol (evita recursión)

-- ─── client_settings ─────────────────────────────────────────
alter table public.client_settings enable row level security;

create policy "Authenticated users can read settings"
  on public.client_settings for select
  using (auth.role() = 'authenticated');

create policy "Owner and admin can update settings"
  on public.client_settings for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ─── departments ─────────────────────────────────────────────
alter table public.departments enable row level security;

create policy "Authenticated can read departments"
  on public.departments for select
  using (auth.role() = 'authenticated');

create policy "Owner and admin can manage departments"
  on public.departments for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ─── profiles ────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "Users can read all profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Owner and admin can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'admin')
    )
  );

-- ─── kpis ────────────────────────────────────────────────────
alter table public.kpis enable row level security;

create policy "Authenticated can read kpis"
  on public.kpis for select
  using (auth.role() = 'authenticated');

create policy "Manager+ can manage kpis"
  on public.kpis for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

-- ─── leads ───────────────────────────────────────────────────
alter table public.leads enable row level security;

create policy "Authenticated can read leads"
  on public.leads for select
  using (auth.role() = 'authenticated' and deleted_at is null);

create policy "Authenticated can create leads"
  on public.leads for insert
  with check (auth.role() = 'authenticated');

create policy "Assigned or manager+ can update leads"
  on public.leads for update
  using (
    assigned_to = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

create policy "Only admin+ can delete leads"
  on public.leads for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ─── lead_activities ─────────────────────────────────────────
alter table public.lead_activities enable row level security;

create policy "Authenticated can read activities"
  on public.lead_activities for select
  using (auth.role() = 'authenticated');

create policy "Authenticated can create activities"
  on public.lead_activities for insert
  with check (auth.uid() = user_id);

-- ─── tasks ───────────────────────────────────────────────────
alter table public.tasks enable row level security;

create policy "Authenticated can read tasks"
  on public.tasks for select
  using (auth.role() = 'authenticated' and deleted_at is null);

create policy "Authenticated can create tasks"
  on public.tasks for insert
  with check (auth.uid() = created_by);

create policy "Assigned or creator or manager+ can update tasks"
  on public.tasks for update
  using (
    assigned_to = auth.uid()
    or created_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

create policy "Only admin+ can delete tasks"
  on public.tasks for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ─── channels ────────────────────────────────────────────────
alter table public.channels enable row level security;

create policy "Members can read channels"
  on public.channels for select
  using (
    not is_private
    or exists (
      select 1 from public.channel_members
      where channel_id = channels.id and user_id = auth.uid()
    )
  );

create policy "Authenticated can create channels"
  on public.channels for insert
  with check (auth.uid() = created_by);

-- ─── channel_members ─────────────────────────────────────────
alter table public.channel_members enable row level security;

create policy "Members can read channel membership"
  on public.channel_members for select
  using (auth.role() = 'authenticated');

-- ─── messages ────────────────────────────────────────────────
alter table public.messages enable row level security;

create policy "Channel members can read messages"
  on public.messages for select
  using (
    deleted_at is null and (
      exists (
        select 1 from public.channels c
        where c.id = channel_id and not c.is_private
      )
      or exists (
        select 1 from public.channel_members cm
        where cm.channel_id = messages.channel_id and cm.user_id = auth.uid()
      )
    )
  );

create policy "Authenticated can send messages"
  on public.messages for insert
  with check (auth.uid() = user_id);

create policy "Author can edit own messages"
  on public.messages for update
  using (user_id = auth.uid());

-- ─── ai_conversations ────────────────────────────────────────
alter table public.ai_conversations enable row level security;

create policy "Users can read own conversations"
  on public.ai_conversations for select
  using (user_id = auth.uid());

create policy "Users can create conversations"
  on public.ai_conversations for insert
  with check (user_id = auth.uid());

create policy "Users can update own conversations"
  on public.ai_conversations for update
  using (user_id = auth.uid());

-- ─── ai_messages ─────────────────────────────────────────────
alter table public.ai_messages enable row level security;

create policy "Users can read messages of own conversations"
  on public.ai_messages for select
  using (
    exists (
      select 1 from public.ai_conversations
      where id = conversation_id and user_id = auth.uid()
    )
  );

create policy "Users can insert messages to own conversations"
  on public.ai_messages for insert
  with check (
    exists (
      select 1 from public.ai_conversations
      where id = conversation_id and user_id = auth.uid()
    )
  );

-- ─── content_pieces ──────────────────────────────────────────
alter table public.content_pieces enable row level security;

create policy "Authenticated can read content"
  on public.content_pieces for select
  using (auth.role() = 'authenticated');

create policy "Authenticated can create content"
  on public.content_pieces for insert
  with check (auth.uid() = created_by);

create policy "Creator or manager+ can update content"
  on public.content_pieces for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

-- ─── competitors ─────────────────────────────────────────────
alter table public.competitors enable row level security;

create policy "Authenticated can read competitors"
  on public.competitors for select
  using (auth.role() = 'authenticated');

create policy "Authenticated can manage competitors"
  on public.competitors for all
  using (auth.role() = 'authenticated');

-- ─── integrations ────────────────────────────────────────────
alter table public.integrations enable row level security;

create policy "Admin+ can manage integrations"
  on public.integrations for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ─── audit_logs ──────────────────────────────────────────────
alter table public.audit_logs enable row level security;

create policy "Admin+ can read audit logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Service role can insert audit logs"
  on public.audit_logs for insert
  with check (true);

-- ─── discovery ───────────────────────────────────────────────
alter table public.discovery_forms enable row level security;
alter table public.discovery_responses enable row level security;

create policy "Authenticated can read forms"
  on public.discovery_forms for select
  using (auth.role() = 'authenticated');

create policy "Manager+ can manage forms"
  on public.discovery_forms for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

create policy "Anyone can submit responses (public forms)"
  on public.discovery_responses for insert
  with check (true);

create policy "Authenticated can read responses"
  on public.discovery_responses for select
  using (auth.role() = 'authenticated');
