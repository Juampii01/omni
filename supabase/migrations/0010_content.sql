-- ============================================================================
-- 0010 — Contenido: ideas, competidores, vault, calendario, guiones
-- ============================================================================
create table public.content_ideas (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  channel     text not null check (channel in ('instagram', 'youtube')),
  title       text not null,
  format      text,
  hook        text,
  notes       text,
  status      text not null default 'idea' check (status in ('idea', 'in_progress', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_content_ideas_client on public.content_ideas (client_id, created_at desc);

drop trigger if exists content_ideas_set_updated_at on public.content_ideas;
create trigger content_ideas_set_updated_at
  before update on public.content_ideas
  for each row execute function public.set_updated_at();

create table public.content_competitors (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  channel     text not null check (channel in ('instagram', 'youtube')),
  handle      text,
  url         text,
  name        text,
  avatar_url  text,
  notes       text,
  created_at  timestamptz not null default now()
);

create index idx_content_competitors_client on public.content_competitors (client_id, created_at desc);

create table public.content_vault (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  channel     text not null check (channel in ('instagram', 'youtube')),
  url         text not null,
  title       text,
  thumbnail   text,
  notes       text,
  favorite    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index idx_content_vault_client on public.content_vault (client_id, created_at desc);

create table public.content_calendar (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  idea_id         uuid references public.content_ideas(id) on delete set null,
  scheduled_date  date not null,
  status          text not null default 'planned' check (status in ('planned', 'recorded', 'published')),
  created_at      timestamptz not null default now()
);

create index idx_content_calendar_client on public.content_calendar (client_id, scheduled_date);

create table public.content_scripts (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  idea_id      uuid references public.content_ideas(id) on delete set null,
  script_type  text not null check (script_type in ('hook', 'full_script', 'story_beats')),
  script       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_content_scripts_client on public.content_scripts (client_id, created_at desc);

drop trigger if exists content_scripts_set_updated_at on public.content_scripts;
create trigger content_scripts_set_updated_at
  before update on public.content_scripts
  for each row execute function public.set_updated_at();

-- RLS: mismo patrón client_own/internal_all/service_role_all para las 5 tablas.
do $$
declare
  t text;
begin
  foreach t in array array['content_ideas', 'content_competitors', 'content_vault', 'content_calendar', 'content_scripts']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "service_role_all" on public.%I for all to service_role using (true) with check (true)', t);
    execute format('create policy "internal_all" on public.%I for all to authenticated using (public.is_internal_staff()) with check (public.is_internal_staff())', t);
    execute format('create policy "client_own" on public.%I for all to authenticated using (client_id in (select p.client_id from public.profiles p where p.id = auth.uid())) with check (client_id in (select p.client_id from public.profiles p where p.id = auth.uid()))', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
