create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  is_pinned  boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements enable row level security;
drop policy if exists "Authenticated can read announcements" on public.announcements;
drop policy if exists "Authenticated can create announcements" on public.announcements;
drop policy if exists "Creator or admin can update announcements" on public.announcements;
drop policy if exists "Creator or admin can delete announcements" on public.announcements;

create policy "Authenticated can read announcements"
  on public.announcements for select using (auth.role() = 'authenticated');
create policy "Authenticated can create announcements"
  on public.announcements for insert with check (auth.uid() = created_by);
create policy "Creator or admin can update announcements"
  on public.announcements for update using (
    auth.uid() = created_by or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );
create policy "Creator or admin can delete announcements"
  on public.announcements for delete using (
    auth.uid() = created_by or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );

drop trigger if exists set_updated_at on public.announcements;
create trigger set_updated_at before update on public.announcements
  for each row execute function public.handle_updated_at();
