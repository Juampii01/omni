-- ============================================================
-- Omni — Seed 001 — Datos reales de Omni Softwares / Juampi
-- ============================================================
-- Correr en: Supabase Dashboard → SQL Editor
-- Idempotente: se puede re-ejecutar sin duplicar datos.
-- Fecha: Junio 2026
-- ============================================================
-- IDs fijos (leídos de la base real):
--   Owner profile:     60e3ac1f-5e0c-49b6-badf-83d64171a12b
--   Ann Sahakyan:      59618c84-ba9f-41b2-8eec-d3527ec79df1
--   GovBidder:         4b0b1566-f217-4829-b636-0506ca580e46
--   Vendly (archivar): 03c71c3a-807a-4124-92aa-14e4035eadf2
--   Spriovanni (arch): 118af999-a4fe-404c-9917-2def9da6c21b
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. CONFIGURACIÓN GLOBAL (client_settings)
-- ────────────────────────────────────────────────────────────
UPDATE public.client_settings
SET
  business_name        = 'Omni Softwares',
  timezone             = 'America/Argentina/Buenos_Aires',
  currency             = 'USD',
  demo_mode            = false,
  onboarding_completed = true,
  updated_at           = now()
WHERE id = (SELECT id FROM public.client_settings LIMIT 1);

-- ────────────────────────────────────────────────────────────
-- 2. DEPARTAMENTOS
-- ────────────────────────────────────────────────────────────
-- Limpiar demo y crear los reales
DELETE FROM public.departments
WHERE name NOT IN ('Operaciones', 'Ventas', 'Contenido');

INSERT INTO public.departments (id, name, description, color, icon, position, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Operaciones', 'Producto, infraestructura y operaciones',    '#236461', 'settings',  0, now(), now()),
  (gen_random_uuid(), 'Ventas',      'Prospección, setters, closers',               '#2563eb', 'trending-up', 1, now(), now()),
  (gen_random_uuid(), 'Contenido',   'Creación y distribución de contenido',        '#7c3aed', 'film',       2, now(), now())
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 3. PERFIL DEL OWNER (Juan Pablo Acosta Caminos)
-- ────────────────────────────────────────────────────────────
UPDATE public.profiles
SET
  full_name     = 'Juan Pablo Acosta Caminos',
  role          = 'owner',
  is_active     = true,
  department_id = (SELECT id FROM public.departments WHERE name = 'Operaciones' LIMIT 1),
  updated_at    = now()
WHERE id = '60e3ac1f-5e0c-49b6-badf-83d64171a12b';

-- Registro de team_member para el owner
INSERT INTO public.team_members (
  profile_id, title, bio, skills, contractor, start_date,
  currency, created_at, updated_at
)
VALUES (
  '60e3ac1f-5e0c-49b6-badf-83d64171a12b',
  'Founder & Developer',
  'Founder de Omni Softwares. Construyo el sistema operativo digital para coaches y mentores high ticket en LATAM. Todo en uno: CRM, contenido, KPIs, IA.',
  ARRAY['Product', 'Development', 'Strategy', 'Sales', 'AI'],
  false,
  '2026-06-01',
  'USD',
  now(),
  now()
)
ON CONFLICT (profile_id) DO UPDATE SET
  title      = EXCLUDED.title,
  bio        = EXCLUDED.bio,
  skills     = EXCLUDED.skills,
  start_date = EXCLUDED.start_date,
  updated_at = now();

-- ────────────────────────────────────────────────────────────
-- 4. CLIENTES ACTIVOS
-- ────────────────────────────────────────────────────────────

-- 4.1 Ann Sahakyan — Smart Scale — $1.500/mes desde Julio 2025
UPDATE public.clients
SET
  full_name      = 'Ann Sahakyan',
  email          = 'ann@smartscale.com',
  company        = 'Smart Scale',
  status         = 'active',
  tier           = 'premium',
  monthly_fee    = 1500.00,
  currency       = 'USD',
  contract_start = '2025-07-01',
  next_renewal   = '2026-07-01',
  owner_id       = '60e3ac1f-5e0c-49b6-badf-83d64171a12b',
  notes          = 'Smart Scale Dashboard. Proyecto: dashboard operativo + analytics. Cliente desde Julio 2025.',
  tags           = ARRAY['premium', 'dashboard', 'analytics'],
  updated_at     = now()
WHERE id = '59618c84-ba9f-41b2-8eec-d3527ec79df1';

-- 4.2 GovBidder (Cristian) — $500/mes desde Mayo 2026
UPDATE public.clients
SET
  full_name      = 'GovBidder',
  company        = 'GovBidder',
  status         = 'active',
  tier           = 'standard',
  monthly_fee    = 500.00,
  currency       = 'USD',
  contract_start = '2026-05-01',
  next_renewal   = '2027-05-01',
  owner_id       = '60e3ac1f-5e0c-49b6-badf-83d64171a12b',
  notes          = 'Content Dashboard + Sales Dashboard. Colaborador/partner: trabajan juntos Juampi, Cristian y Santo.',
  tags           = ARRAY['standard', 'partner', 'content', 'sales'],
  updated_at     = now()
WHERE id = '4b0b1566-f217-4829-b636-0506ca580e46';

-- 4.3 Archivar clientes demo (Vendly, Spriovanni)
UPDATE public.clients
SET
  status     = 'churned',
  notes      = 'Dato demo — archivado al cargar datos reales (Junio 2026)',
  updated_at = now()
WHERE id IN (
  '03c71c3a-807a-4124-92aa-14e4035eadf2',
  '118af999-a4fe-404c-9917-2def9da6c21b'
);

-- ────────────────────────────────────────────────────────────
-- 5. REVENUE RECORDS
-- ────────────────────────────────────────────────────────────
-- Limpiar datos demo existentes (había 15 filas de seed)
DELETE FROM public.revenue_records;

-- Ann Sahakyan: $1.500/mes × 12 meses (Jul 2025 → Jun 2026)
INSERT INTO public.revenue_records
  (period_month, client_id, category, amount, currency, description, paid_at, created_by, created_at, updated_at)
SELECT
  gs::date                                          AS period_month,
  '59618c84-ba9f-41b2-8eec-d3527ec79df1'::uuid      AS client_id,
  'retainer'                                         AS category,
  1500.00                                            AS amount,
  'USD'                                              AS currency,
  'Retainer mensual — Smart Scale Dashboard'         AS description,
  (gs + interval '1 month - 1 day')::date            AS paid_at,
  '60e3ac1f-5e0c-49b6-badf-83d64171a12b'::uuid      AS created_by,
  now()                                              AS created_at,
  now()                                              AS updated_at
FROM generate_series(
  '2025-07-01'::date,
  '2026-06-01'::date,
  '1 month'::interval
) AS gs;

-- GovBidder: $500/mes × 2 meses (May 2026 → Jun 2026)
INSERT INTO public.revenue_records
  (period_month, client_id, category, amount, currency, description, paid_at, created_by, created_at, updated_at)
SELECT
  gs::date                                          AS period_month,
  '4b0b1566-f217-4829-b636-0506ca580e46'::uuid      AS client_id,
  'retainer'                                         AS category,
  500.00                                             AS amount,
  'USD'                                              AS currency,
  'Retainer mensual — GovBidder Content + Sales Dashboard' AS description,
  (gs + interval '1 month - 1 day')::date            AS paid_at,
  '60e3ac1f-5e0c-49b6-badf-83d64171a12b'::uuid      AS created_by,
  now()                                              AS created_at,
  now()                                              AS updated_at
FROM generate_series(
  '2026-05-01'::date,
  '2026-06-01'::date,
  '1 month'::interval
) AS gs;

-- ────────────────────────────────────────────────────────────
-- 6. EXPENSE RECORDS
-- ────────────────────────────────────────────────────────────
-- Limpiar demo
DELETE FROM public.expense_records;

-- Herramientas desde Junio 2026
INSERT INTO public.expense_records
  (period_month, category, amount, currency, vendor, description, paid_at, created_by, created_at, updated_at)
VALUES
  ('2026-06-01', 'tools', 200.00, 'USD', 'Vercel / Supabase / Tools',
   'Hosting (Vercel), base de datos (Supabase) y herramientas SaaS mensuales',
   '2026-06-01',
   '60e3ac1f-5e0c-49b6-badf-83d64171a12b', now(), now());

-- ────────────────────────────────────────────────────────────
-- 7. KPIs — Junio 2026 (mes base)
-- ────────────────────────────────────────────────────────────
-- Nota: el constraint unique(period_month, category, metric_name, department_id)
-- no se dispara con NULLs (Postgres trata NULLs como distintos), por eso
-- borramos antes en vez de usar ON CONFLICT.
DELETE FROM public.kpis WHERE period_month = '2026-06-01';

INSERT INTO public.kpis
  (period_month, category, metric_name, metric_value, metric_target, unit, notes, created_at, updated_at)
VALUES
  -- Ventas
  ('2026-06-01', 'Ventas', 'MRR',
    2000,  20000, 'USD',
    'Ann Sahakyan $1.500 + GovBidder $500', now(), now()),
  ('2026-06-01', 'Ventas', 'Clientes activos',
    2,     20,    'clientes',
    'Ann Sahakyan (premium) + GovBidder (standard)', now(), now()),
  ('2026-06-01', 'Ventas', 'Leads calificados',
    0,     10,    'leads',
    'Pipeline vacío al inicio de operaciones de prospección', now(), now()),
  ('2026-06-01', 'Ventas', 'Llamadas agendadas',
    0,     10,    'calls',
    NULL, now(), now()),
  ('2026-06-01', 'Ventas', 'Tasa de cierre',
    0,     30,    '%',
    NULL, now(), now()),
  ('2026-06-01', 'Ventas', 'Ticket promedio Omni',
    4500,  4500,  'USD',
    '$4.000 setup + $500 primer mes', now(), now()),

  -- Contenido
  ('2026-06-01', 'Contenido', 'Seguidores Instagram',
    0,     1000,  'seguidores',
    '@juampiiacosta_ — cuenta nueva', now(), now()),
  ('2026-06-01', 'Contenido', 'Posts publicados',
    0,     4,     'posts',
    NULL, now(), now()),
  ('2026-06-01', 'Contenido', 'Reels publicados',
    0,     8,     'reels',
    NULL, now(), now()),
  ('2026-06-01', 'Contenido', 'Engagement rate',
    0,     5,     '%',
    NULL, now(), now()),

  -- Prospección
  ('2026-06-01', 'Prospección', 'Conversaciones nuevas',
    0,     30,    'convs',
    'ManyChat pipeline — arranque en Julio 2026', now(), now()),
  ('2026-06-01', 'Prospección', 'Calificados',
    0,     10,    'leads',
    NULL, now(), now()),
  ('2026-06-01', 'Prospección', 'Agendados',
    0,     5,     'calls',
    NULL, now(), now()),
  ('2026-06-01', 'Prospección', 'Show-up rate',
    0,     70,    '%',
    NULL, now(), now()),

  -- Finanzas
  ('2026-06-01', 'Finanzas', 'Revenue total',
    2000,  5000,  'USD',
    NULL, now(), now()),
  ('2026-06-01', 'Finanzas', 'Gastos totales',
    200,   500,   'USD',
    'Herramientas y hosting', now(), now()),
  ('2026-06-01', 'Finanzas', 'Margen neto',
    1800,  4500,  'USD',
    NULL, now(), now()),
  ('2026-06-01', 'Finanzas', 'Margen %',
    90,    85,    '%',
    '($1.800 / $2.000) × 100', now(), now());

-- ────────────────────────────────────────────────────────────
-- 8. LEADS / PIPELINE
-- ────────────────────────────────────────────────────────────
-- Soft-delete los leads demo (mantener solo los won = clientes reales)
UPDATE public.leads
SET
  deleted_at = now(),
  updated_at = now(),
  notes      = COALESCE(notes, '') || ' [demo data — archivado Junio 2026]'
WHERE stage NOT IN ('won', 'lost')
  AND deleted_at IS NULL;

-- ────────────────────────────────────────────────────────────
-- 9. COMPETIDORES
-- ────────────────────────────────────────────────────────────
DELETE FROM public.competitors;

INSERT INTO public.competitors
  (name, category, website_url, notes, tags, added_by, created_at, updated_at)
VALUES
  (
    'Notion',
    'Productividad / Organización',
    'https://notion.so',
    'Herramienta genérica que coaches usan para organizar su negocio. Sin IA contextualizada, sin módulos específicos para high ticket, sin pipeline de ventas nativo. Puntos débiles: curva de personalización alta, no está pensada para el flujo de un coach/mentor.',
    ARRAY['genérico', 'productividad', 'organización', 'wiki'],
    '60e3ac1f-5e0c-49b6-badf-83d64171a12b',
    now(), now()
  ),
  (
    'ClickUp',
    'Gestión de proyectos',
    'https://clickup.com',
    'Gestión de proyectos muy potente pero genérica. Curva de aprendizaje alta, demasiadas opciones para un coach solo. No tiene módulos específicos para ventas high ticket ni para análisis de contenido Instagram. Precio puede escalar.',
    ARRAY['genérico', 'gestión-proyectos', 'complejo', 'curva-alta'],
    '60e3ac1f-5e0c-49b6-badf-83d64171a12b',
    now(), now()
  ),
  (
    'GoHighLevel',
    'CRM / Marketing',
    'https://gohighlevel.com',
    'CRM pensado para agencias de marketing digital. Caro (~$97-$297/mes), muy complejo de configurar, sobrecargado de features para un coach individual o equipo chico. Fuerte en automatizaciones pero no en analytics de contenido ni en IA contextualizada.',
    ARRAY['crm', 'agencias', 'caro', 'automatización'],
    '60e3ac1f-5e0c-49b6-badf-83d64171a12b',
    now(), now()
  );

-- ────────────────────────────────────────────────────────────
-- 10. VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
-- Estas queries se ejecutan al final para confirmar los datos.
-- Si querés ver los resultados, correlas por separado:

-- SELECT business_name, currency, timezone FROM client_settings;
-- SELECT full_name, status, tier, monthly_fee FROM clients ORDER BY created_at;
-- SELECT period_month, client_id, amount FROM revenue_records ORDER BY period_month;
-- SELECT period_month, category, amount FROM expense_records ORDER BY period_month;
-- SELECT COUNT(*) FROM kpis WHERE period_month = '2026-06-01';
-- SELECT name FROM competitors;
-- SELECT COUNT(*) FROM leads WHERE deleted_at IS NULL;

COMMIT;
