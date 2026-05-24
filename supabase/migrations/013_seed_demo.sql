-- ============================================================
-- Omni — Migration 013 — Demo Seed Data
-- ============================================================
-- Realistic sample data for KAVAR / Omni demo.
-- Safe to run multiple times (uses DO $$ blocks with checks).
-- ============================================================

-- ─── client_settings update (demo agency) ────────────────────
update public.client_settings
set
  business_name       = 'KAVAR LLC',
  currency            = 'USD',
  timezone            = 'America/Argentina/Buenos_Aires',
  onboarding_completed = true,
  demo_mode           = true
where true;

-- ─── Clients ─────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from public.clients where full_name = 'Martina Rodríguez') then
    insert into public.clients (full_name, email, company, instagram_handle, status, tier, monthly_fee, currency, contract_start, next_renewal, tags, notes)
    values
      ('Martina Rodríguez', 'martina@mrconsulting.com', 'MR Consulting', 'martinarodriguez.co', 'active', 'vip',    3500, 'USD', current_date - interval '8 months', current_date + interval '4 months', array['coaching','lanzamientos','high-ticket'], 'Cliente estrella. Vende mentoría grupal $1.500/mes. Lanzamiento en Q2.'),
      ('Santiago Méndez',   'santi@mendezdigital.com',  'Méndez Digital',  'santimendigital',     'active', 'premium', 2800, 'USD', current_date - interval '5 months', current_date + interval '7 months', array['agencia','retainer'],                 'Agencia 3 empleados. Foco en cliente B2B tech.'),
      ('Valentina Lagos',   'vale@valelagos.com',        null,              'valelagos.fit',       'active', 'premium', 2000, 'USD', current_date - interval '3 months', current_date + interval '9 months', array['fitness','infoproductos'],            'Coach fitness. Lanzó curso $497. Quiere escalar a $2k.'),
      ('Rodrigo Castillo',  'rodri@castillomkt.io',      'Castillo Mkt',    'rodrigocastillomkt',  'paused', 'standard', 1500, 'USD', current_date - interval '11 months', current_date - interval '1 month',  array['marketing','ecommerce'],              'Pausa por viaje. Retoma en agosto.'),
      ('Camila Soto',       'cami@camilasoto.com',        null,              'camilasoto_coach',    'active', 'vip',    4200, 'USD', current_date - interval '14 months', current_date + interval '10 months', array['coaching','mastermind','premium'],    'Top cliente. Mastermind $4.200/mes. 27 alumnos activos.');
  end if;
end $$;

-- ─── Revenue records (12 months) ─────────────────────────────
do $$ begin
  if not exists (select 1 from public.revenue_records where description = 'seed_demo') then
    insert into public.revenue_records (period_month, category, amount, currency, description)
    values
      -- MRR retainers
      (date_trunc('month', current_date - interval '11 months'), 'retainer', 8200,  'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '10 months'), 'retainer', 9500,  'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '9 months'),  'retainer', 9500,  'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '8 months'),  'retainer', 11000, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '7 months'),  'retainer', 11000, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '6 months'),  'retainer', 12500, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '5 months'),  'retainer', 12500, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '4 months'),  'retainer', 14000, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '3 months'),  'retainer', 14000, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '2 months'),  'retainer', 14000, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '1 month'),   'retainer', 16500, 'USD', 'seed_demo'),
      (date_trunc('month', current_date),                        'retainer', 16500, 'USD', 'seed_demo'),
      -- Upsells / one-time
      (date_trunc('month', current_date - interval '9 months'),  'upsell',    1200, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '6 months'),  'one_time',  2500, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '3 months'),  'upsell',    1800, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '1 month'),   'referral',   900, 'USD', 'seed_demo'),
      (date_trunc('month', current_date),                        'upsell',    2100, 'USD', 'seed_demo');
  end if;
end $$;

-- ─── Expense records ─────────────────────────────────────────
do $$ begin
  if not exists (select 1 from public.expense_records where description = 'seed_demo') then
    insert into public.expense_records (period_month, category, amount, currency, description)
    values
      (date_trunc('month', current_date - interval '2 months'), 'tools',       380, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '2 months'), 'contractors', 800, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '1 month'),  'tools',       380, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '1 month'),  'ads',         600, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '1 month'),  'contractors', 800, 'USD', 'seed_demo'),
      (date_trunc('month', current_date),                        'tools',       380, 'USD', 'seed_demo'),
      (date_trunc('month', current_date),                        'ads',         750, 'USD', 'seed_demo'),
      (date_trunc('month', current_date),                        'contractors', 800, 'USD', 'seed_demo');
  end if;
end $$;

-- ─── KPIs (MRR en tabla kpis para el home) ───────────────────
do $$ begin
  if not exists (select 1 from public.kpis where metric_name = 'MRR' and notes = 'seed_demo') then
    insert into public.kpis (period_month, category, metric_name, metric_value, metric_target, unit, notes)
    values
      (date_trunc('month', current_date - interval '2 months'), 'finance', 'MRR', 14000, 15000, 'USD', 'seed_demo'),
      (date_trunc('month', current_date - interval '1 month'),  'finance', 'MRR', 16500, 18000, 'USD', 'seed_demo'),
      (date_trunc('month', current_date),                        'finance', 'MRR', 18600, 20000, 'USD', 'seed_demo');
  end if;
end $$;

-- ─── Launches ────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from public.launches where name = 'Lanzamiento Abril 2026') then
    with inserted_launch as (
      insert into public.launches (name, description, status, start_date, end_date, target_revenue, actual_revenue, participant_count, coupon_code, coupon_discount_pct)
      values ('Lanzamiento Abril 2026', 'Lanzamiento del programa Mentoria Premium con live de YouTube + secuencia de emails.',
              'closed', current_date - interval '45 days', current_date - interval '38 days',
              15000, 18200, 14, 'KAVAR30', 30)
      returning id
    )
    insert into public.launch_participants (launch_id, full_name, email, paid, amount_paid)
    select id, p.full_name, p.email, p.paid, p.amount_paid
    from inserted_launch, (values
      ('Ana García',     'ana@garcia.com',     true,  1300),
      ('Carlos Pérez',   'carlos@perez.io',    true,  1300),
      ('Lucía Fernández', 'lucia@luciafe.com', true,  1300),
      ('Diego Morales',  'diego@morales.com',  true,  1300),
      ('Sofía Herrera',  'sofia@sherrera.com', true,  1300),
      ('Nicolás Vargas', 'nico@vargas.com',    true,  1300),
      ('Isabella Cruz',  'isa@cruz.com',       true,  1300),
      ('Mateo Torres',   'mateo@torres.co',    true,  1300),
      ('Valentina Ruiz', 'vale@ruiz.com',       true,  1300),
      ('Sebastián Luna', 'seba@luna.com',      true,  1300),
      ('Camila Reyes',   'cami@reyes.com',     false, null),
      ('Tomás Aguirre',  'tomas@aguirre.com',  false, null),
      ('Paula Mendoza',  'paula@mendoza.com',  false, null),
      ('Javier Ramos',   'javier@ramos.com',   false, null)
    ) as p(full_name, email, paid, amount_paid);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from public.launches where name = 'Lanzamiento Mayo 2026') then
    insert into public.launches (name, description, status, start_date, end_date, target_revenue, participant_count, coupon_code, coupon_discount_pct)
    values ('Lanzamiento Mayo 2026', 'Próximo lanzamiento del programa de 3 meses. Abierto a lista de espera.',
            'planning', current_date + interval '5 days', current_date + interval '12 days',
            20000, 0, 'KAVAR25', 25);
  end if;
end $$;

-- ─── Announcements ───────────────────────────────────────────
do $$ begin
  if not exists (select 1 from public.announcements where title = '¡Récord de MRR! 🚀') then
    insert into public.announcements (title, body, is_pinned)
    values
      ('¡Récord de MRR! 🚀', 'Este mes cerramos $18.600 de MRR — un +13% respecto al mes anterior. Lanzamiento de mayo en camino.', true),
      ('Onboarding Camila completado', 'Camila Soto ya tiene acceso completo al Mastermind. Recordar call de kick-off el viernes.', false);
  end if;
end $$;

-- ─── Tasks de ejemplo ────────────────────────────────────────
do $$ begin
  if not exists (select 1 from public.tasks where title = 'Preparar secuencia de emails lanzamiento mayo') then
    insert into public.tasks (title, description, status, priority, due_date)
    values
      ('Preparar secuencia de emails lanzamiento mayo',  'Escribir 7 emails de la secuencia de lanzamiento con IA',          'todo',        'urgent', current_date + interval '4 days'),
      ('Grabar video de ventas programa mentoria',        'VSL de 20 min para landing del lanzamiento',                        'in_progress', 'high',   current_date + interval '7 days'),
      ('Subir contenido semanal Instagram',               '3 reels + 2 carruseles programados para la semana',                 'todo',        'medium', current_date + interval '2 days'),
      ('Renovar contrato Rodrigo Castillo',               'Llamada de check-in y presentar propuesta de continuidad',          'todo',        'high',   current_date + interval '10 days'),
      ('Informe mensual clientes VIP',                    'Enviar reportes de resultados a Martina y Camila',                  'todo',        'medium', current_date + interval '5 days'),
      ('Configurar webhook Instagram en Meta',            'Finalizar configuración de webhooks para el dashboard de contenido', 'todo',        'low',    current_date + interval '14 days');
  end if;
end $$;
