-- ============================================================
-- Omni — Migration 004 — Extras
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── announcements ───────────────────────────────────────────
-- (tabla para el módulo Comunicaciones)

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

drop policy if exists "Authenticated can read announcements"   on public.announcements;
drop policy if exists "Authenticated can create announcements" on public.announcements;
drop policy if exists "Creator or admin can update announcements" on public.announcements;
drop policy if exists "Creator or admin can delete announcements" on public.announcements;

create policy "Authenticated can read announcements"
  on public.announcements for select
  using (auth.role() = 'authenticated');

create policy "Authenticated can create announcements"
  on public.announcements for insert
  with check (auth.uid() = created_by);

create policy "Creator or admin can update announcements"
  on public.announcements for update
  using (
    auth.uid() = created_by or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );

create policy "Creator or admin can delete announcements"
  on public.announcements for delete
  using (
    auth.uid() = created_by or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );

drop trigger if exists set_updated_at_announcements on public.announcements;
create trigger set_updated_at_announcements
  before update on public.announcements
  for each row execute function public.handle_updated_at();


-- ─── Discovery: acceso público a formularios activos ──────────
-- Permite que personas sin cuenta (prospects) llenen formularios.

drop policy if exists "Public can read active forms" on public.discovery_forms;
create policy "Public can read active forms"
  on public.discovery_forms for select
  using (is_active = true);

-- La política de INSERT en discovery_responses ya permite anónimos:
-- "Anyone can submit responses (public forms)" with check (true)
-- Si no existe, crearla:
drop policy if exists "Anyone can submit responses (public forms)" on public.discovery_responses;
create policy "Anyone can submit responses (public forms)"
  on public.discovery_responses for insert
  with check (true);


-- ─── Storage buckets ─────────────────────────────────────────
-- Ejecutar DESPUÉS de crear los buckets en el dashboard de Supabase.
-- Supabase → Storage → New bucket:
--   • "avatars"  (público)
--   • "logos"    (público)

-- Políticas de Storage para avatars
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('logos', 'logos', true)
  on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Anyone can read avatars" on storage.objects;
create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Allow authenticated users to manage logos
drop policy if exists "Authenticated can manage logos" on storage.objects;
create policy "Authenticated can manage logos"
  on storage.objects for all
  using (bucket_id = 'logos' and auth.role() = 'authenticated');

drop policy if exists "Anyone can read logos" on storage.objects;
create policy "Anyone can read logos"
  on storage.objects for select
  using (bucket_id = 'logos');
