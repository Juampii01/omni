-- ============================================================
-- Omni — Migration 022 — Estrategia del negocio (KAVAR)
-- ============================================================
-- Hub de estrategia del negocio (single-tenant): una sola fila.
-- Pilares: Norte, Oferta & Pricing, Objetivos & OKRs, Crecimiento,
-- Forecast e Iniciativas. Los campos de lista van como jsonb.
-- ============================================================

create table if not exists public.business_strategy (
  id          uuid primary key default gen_random_uuid(),
  singleton   boolean not null default true unique,  -- garantiza 1 sola fila
  -- Norte
  mission     text,
  vision      text,
  core_values jsonb not null default '[]'::jsonb,   -- string[]
  positioning text,
  -- Oferta & Pricing
  tiers       jsonb not null default '[]'::jsonb,   -- {name,price,value_prop,features[]}[]
  -- Objetivos & OKRs
  okrs        jsonb not null default '[]'::jsonb,   -- {objective,metric,target,current,period,status}[]
  -- Crecimiento
  growth      jsonb not null default '[]'::jsonb,   -- {channel,focus,status}[]
  -- Forecast
  forecast    jsonb not null default '{}'::jsonb,   -- {target_mrr,target_clients,horizon_months,notes}
  -- Iniciativas
  initiatives jsonb not null default '[]'::jsonb,   -- {title,description,priority,status}[]
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

alter table public.business_strategy enable row level security;

drop policy if exists "active profile reads strategy"   on public.business_strategy;
drop policy if exists "manager+ writes strategy insert"  on public.business_strategy;
drop policy if exists "manager+ writes strategy update"  on public.business_strategy;

create policy "active profile reads strategy"
  on public.business_strategy for select to authenticated
  using (public.auth_is_active());

create policy "manager+ writes strategy insert"
  on public.business_strategy for insert to authenticated
  with check (public.auth_is_manager_plus());

create policy "manager+ writes strategy update"
  on public.business_strategy for update to authenticated
  using (public.auth_is_manager_plus())
  with check (public.auth_is_manager_plus());

-- ─── Fila semilla con data base de KAVAR (editable desde la UI) ──────────────
insert into public.business_strategy (singleton, mission, vision, core_values, positioning, tiers, growth, forecast)
values (
  true,
  'Darle a cada negocio un sistema operativo único que centralice su operación y le diga qué hacer.',
  'Que operar un negocio se sienta tan claro como mirar una sola pantalla.',
  '["Claridad sobre ruido","Resultados, no features","Una instancia por negocio","Velocidad con criterio"]'::jsonb,
  'Omni es el sistema operativo de todo tu negocio: operación, clientes, equipo, métricas y una IA que te dice qué hacer — en una instancia privada.',
  '[
    {"name":"Foundation","price":"$5.000 setup + $500/mes","value_prop":"La base operativa de Omni para arrancar.","features":["Instancia privada","CRM + pipeline","Tareas & equipo","Métricas core"]},
    {"name":"Growth","price":"A definir","value_prop":"Más automatización y contenido.","features":["Todo Foundation","Automatizaciones","Contenido & redes"]},
    {"name":"Scale","price":"A definir","value_prop":"Para equipos que escalan.","features":["Todo Growth","Multi-área","Reportes avanzados"]},
    {"name":"Enterprise","price":"A medida","value_prop":"Implementación a medida.","features":["Todo Scale","Integraciones a medida","Soporte dedicado"]}
  ]'::jsonb,
  '[
    {"channel":"Contenido (LinkedIn / IG)","focus":"Posicionar a Juampi + casos de éxito","status":"activo"},
    {"channel":"Outbound","focus":"Prospección directa a founders","status":"activo"},
    {"channel":"Referidos","focus":"Clientes felices → intros","status":"planificado"}
  ]'::jsonb,
  '{"target_mrr":"","target_clients":"","horizon_months":12,"notes":"Cargar proyección desde 08-FINANZAS/Forecast"}'::jsonb
)
on conflict (singleton) do nothing;
