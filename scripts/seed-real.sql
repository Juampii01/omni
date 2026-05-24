-- =============================================================
-- seed-real.sql — KAVAR LLC real operational data (24 may 2026)
-- Run via: Management API POST /database/query
-- =============================================================
do $$
declare
  owner_id   uuid;
  ann_id     uuid;
  gov_id     uuid;
  vendly_id  uuid;
  sprio_id   uuid;
  launch_id  uuid;
  m0  date := date_trunc('month', current_date)::date;             -- 2026-05-01
  m1  date := (date_trunc('month', current_date) - interval '1 month')::date;  -- 2026-04-01
  m2  date := (date_trunc('month', current_date) - interval '2 months')::date; -- 2026-03-01
  m3  date := (date_trunc('month', current_date) - interval '3 months')::date; -- 2026-02-01
  m4  date := (date_trunc('month', current_date) - interval '4 months')::date; -- 2026-01-01
  m5  date := (date_trunc('month', current_date) - interval '5 months')::date; -- 2025-12-01
  m6  date := (date_trunc('month', current_date) - interval '6 months')::date; -- 2025-11-01
  m7  date := (date_trunc('month', current_date) - interval '7 months')::date; -- 2025-10-01
  m8  date := (date_trunc('month', current_date) - interval '8 months')::date; -- 2025-09-01
  today date := current_date;
begin

  -- ── 0. Owner profile ────────────────────────────────────────
  select id into owner_id from public.profiles limit 1;
  raise notice '✅ Owner: %', owner_id;

  -- ── 1. Clean demo data ──────────────────────────────────────
  delete from public.launches
    where name in ('Lanzamiento Abril 2026', 'Lanzamiento Mayo 2026');

  delete from public.clients
    where full_name in (
      'Martina Rodríguez','Santiago Méndez','Valentina Lagos',
      'Rodrigo Castillo','Camila Soto'
    );

  delete from public.revenue_records  where description = 'seed_demo';
  delete from public.expense_records  where description = 'seed_demo';
  delete from public.kpis             where notes = 'seed_demo';

  delete from public.announcements
    where title in ('¡Récord de MRR! 🚀','Onboarding Camila completado');

  delete from public.tasks
    where title in (
      'Preparar secuencia de emails lanzamiento mayo',
      'Grabar video de ventas programa mentoria',
      'Subir contenido semanal Instagram',
      'Renovar contrato Rodrigo Castillo',
      'Informe mensual clientes VIP',
      'Configurar webhook Instagram en Meta'
    );

  -- Clean any previous real-seed clients for idempotence
  delete from public.clients
    where full_name in ('Ann Sahakyan','GovBidder','Vendly','Spriovanni Indumentaria');

  raise notice '🧹 Demo data cleaned';

  -- ── 2. client_settings ──────────────────────────────────────
  update public.client_settings set
    business_name        = 'KAVAR LLC',
    currency             = 'USD',
    timezone             = 'America/Argentina/Buenos_Aires',
    onboarding_completed = true,
    demo_mode            = false;

  raise notice '⚙️  client_settings updated';

  -- ── 3. Real clients ─────────────────────────────────────────

  -- Ann Sahakyan
  insert into public.clients (
    full_name, company, industry, email, status, tier,
    monthly_fee, currency, health_score, slack_channel,
    contract_start, notes, tags
  ) values (
    'Ann Sahakyan', 'Smart Scale', 'Coaching / SaaS',
    'ann@smartscale.com', 'active', 'premium',
    1500, 'USD', 65, '#ann-smart-scale',
    '2025-09-01',
    'PRODUCTO: Smart Scale Dashboard
- 5 tablas en producción: profiles, research_requests, competitor_snapshots, ai_diagnosis_*
- Stack: Next.js + Supabase
- Funcionalidades: Research competitivo, AI Diagnosis, Métricas ventas

⚠️ URGENTE PHASE B+C:
- RLS desactivado en producción
- Anon key con TODOS los privilegios
- SIN BACKUPS
- ORDEN: Backup primero, después REVOKE + RLS

PRÓX ACCIÓN: Subir a $2,000/mes post Phase C completada',
    '{"coaching","saas","phase-b-pendiente"}'
  ) returning id into ann_id;

  -- GovBidder
  insert into public.clients (
    full_name, company, industry, status, tier,
    monthly_fee, currency, health_score, slack_channel,
    contract_start, notes, tags
  ) values (
    'GovBidder', 'GovBidder', 'GovTech / Licitaciones públicas',
    'active', 'standard',
    500, 'USD', 80, '#govbidder',
    '2026-01-01',
    '3 PRODUCTOS DESARROLLADOS:
1. GovBidder Sales Dashboard — gestión de licitaciones
2. Content Dashboard — investigación, estudio, tareas, bases del negocio
3. Portal de Lanzamiento — login + desbloqueo diario + cupones automáticos + YouTube Live (4 días)

CONTACTOS:
- Cristián: cliente principal, decisor
- Santo: socio de Cristián (se está alejando internamente — problema de ellos)

⚠️ RENEGOCIACIÓN PROGRAMADA: 1/6/2026
Target: subir de $500/mes a $1,000-$1,500/mes
Justificación: desarrollé 3 dashboards en lugar de mantenimiento simple

BUGS LOOM PENDIENTES (Cristián):
- Pop-up sesión
- Selector de cliente
- Conectar IG
- Botón TikTok

PENDIENTES TÉCNICOS:
- Verificar OAUTH_TOKEN_ENCRYPTION_KEY en Vercel (Content Dashboard)
- Verificar GitHub Secrets DATABASE_URL + DIRECT_URL',
    '{"govtech","licitaciones","renegociacion"}'
  ) returning id into gov_id;

  -- Vendly (internal paused)
  insert into public.clients (
    full_name, company, industry, status, tier,
    monthly_fee, currency, health_score, notes, tags
  ) values (
    'Vendly', 'KAVAR (interno)', 'Web design / E-commerce',
    'internal_paused', 'standard',
    0, 'USD', 50,
    'MI PRODUCTO INTERNO PAUSADO.
Servicio de páginas web ready-to-sell para e-commerce.
Modelo: setup ~$500 + maintenance mensual.
PAUSADO hasta validar Omni como flagship.
1 cliente real activo: Spriovanni Indumentaria',
    '{"interno","pausado","ecommerce"}'
  ) returning id into vendly_id;

  -- Spriovanni (sub-client of Vendly)
  insert into public.clients (
    full_name, company, industry, status, tier,
    monthly_fee, setup_paid, currency, health_score,
    parent_client_id, notes, tags
  ) values (
    'Spriovanni Indumentaria', 'Spriovanni', 'E-commerce / Indumentaria',
    'active', 'standard',
    0, 500, 'USD', 75,
    vendly_id,
    'Cliente de Vendly. Sitio web de ropa. Setup pagado $500.',
    '{"ecommerce","indumentaria","vendly"}'
  ) returning id into sprio_id;

  raise notice '👥 Clients: Ann(%), GovBidder(%), Vendly(%), Spriovanni(%)',
    ann_id, gov_id, vendly_id, sprio_id;

  -- ── 4. Contacts ─────────────────────────────────────────────
  insert into public.contacts (client_id, name, email, role, is_primary) values
    (ann_id, 'Ann Sahakyan', 'ann@smartscale.com', 'Founder', true);

  insert into public.contacts (client_id, name, email, role, is_primary, notes) values
    (gov_id, 'Cristián', 'cristian@govbidder.com', 'Founder / Decisor', true,
     'Cliente principal. Me contrató y trabaja con Santo.'),
    (gov_id, 'Santo', 'santo@govbidder.com', 'Socio', false,
     'Socio de Cristián. Cristián se está alejando de él — problema de ellos.');

  raise notice '📇 Contacts created';

  -- ── 5. Revenue records ──────────────────────────────────────
  -- Ann: $1,500/mes × 9 months (Sep 2025 – May 2026)
  insert into public.revenue_records (period_month, client_id, category, amount, currency, description)
  select m, ann_id, 'retainer', 1500, 'USD', 'Smart Scale retainer — ' || to_char(m, 'YYYY-MM')
  from unnest(array[m8,m7,m6,m5,m4,m3,m2,m1,m0]) as m;

  -- GovBidder: $500/mes × 5 months (Jan – May 2026)
  insert into public.revenue_records (period_month, client_id, category, amount, currency, description)
  select m, gov_id, 'retainer', 500, 'USD', 'GovBidder retainer — ' || to_char(m, 'YYYY-MM')
  from unnest(array[m4,m3,m2,m1,m0]) as m;

  -- Spriovanni setup $500 in April 2026
  insert into public.revenue_records (period_month, client_id, category, amount, currency, description)
  values (m1, sprio_id, 'one_time', 500, 'USD', 'Spriovanni — setup fee web');

  raise notice '💰 Revenue records inserted';

  -- ── 6. Expenses (3 months × 6 items) ────────────────────────
  insert into public.expense_records (period_month, category, amount, currency, description)
  select m, cat, amt, 'USD', desc_
  from unnest(array[m2,m1,m0]) as m
  cross join (values
    ('tools',  25,  'Notion + Calendly'),
    ('tools',  20,  'Claude Pro'),
    ('tools',  20,  'Cursor'),
    ('tools',  7,   'Google Workspace'),
    ('ads',    99,  'LinkedIn Sales Navigator'),
    ('other',  25,  'Doola LLC compliance (amortizado)')
  ) as e(cat, amt, desc_);

  raise notice '🧾 Expenses inserted';

  -- ── 7. KPIs ─────────────────────────────────────────────────
  insert into public.kpis (period_month, category, metric_name, metric_value, metric_target, unit, notes) values
    (m2, 'finance', 'MRR', 1500, 2000,  'USD', 'Solo Ann activa'),
    (m1, 'finance', 'MRR', 2000, 3000,  'USD', 'Ann $1500 + GovBidder $500'),
    (m0, 'finance', 'MRR', 2000, 5000,  'USD', 'Ann $1500 + GovBidder $500. Meta: $20k en 12-18 meses.');

  raise notice '📊 KPIs inserted';

  -- ── 8. Tasks ────────────────────────────────────────────────
  insert into public.tasks (title, description, status, priority, created_by, due_date, tags) values
    -- Smart Scale URGENT
    ('Smart Scale Phase B: Backup pg_dump completo',
     'pg_dump de 5 tablas de Ann → R2 o local. VALIDAR restore en proyecto test ANTES de Phase C.',
     'todo', 'urgent', owner_id, today + 2, '{"ann","seguridad"}'),
    ('Smart Scale Phase C: REVOKE anon + activar RLS',
     'Solo DESPUÉS de backup validado. REVOKE privileges anon + activar RLS en 5 tablas + crear policies + tests.',
     'todo', 'urgent', owner_id, today + 4, '{"ann","seguridad"}'),
    ('Subir a Ann a $2,000/mes',
     'Post Phase C completada. Justificación: trabajo extra de seguridad + nuevo scope.',
     'todo', 'high', owner_id, today + 8, '{"ann","revenue"}'),

    -- GovBidder
    ('Renegociación GovBidder a $1,000-1,500/mes',
     'Mostrar valor entregado: 3 dashboards completos. Cobrar lo justo. Call programada para 1/6.',
     'todo', 'high', owner_id, today + 8, '{"govbidder","revenue"}'),
    ('Trackeo diario de horas en GovBidder durante mayo',
     'Justificar renegociación con data real de horas trabajadas.',
     'in_progress', 'high', owner_id, null, '{"govbidder"}'),
    ('Responder Loom de Cristián con audio Wispr Flow',
     'Pendiente de respuesta.',
     'todo', 'high', owner_id, today + 1, '{"govbidder","comunicacion"}'),
    ('Fix: Pop-up de sesión (Cristián Loom)',
     'Bug reportado en Loom. Content Dashboard.',
     'todo', 'high', owner_id, null, '{"govbidder","bug"}'),
    ('Fix: Selector de cliente (Cristián Loom)',
     'Bug reportado en Loom. Content Dashboard.',
     'todo', 'high', owner_id, null, '{"govbidder","bug"}'),
    ('Fix: Conectar IG (Cristián Loom)',
     'OAuth flow de Instagram no está funcionando para ellos.',
     'todo', 'high', owner_id, null, '{"govbidder","bug"}'),
    ('Fix: Botón TikTok (Cristián Loom)',
     'Bug reportado en Loom.',
     'todo', 'medium', owner_id, null, '{"govbidder","bug"}'),
    ('Verificar OAUTH_TOKEN_ENCRYPTION_KEY en Vercel (Content Dashboard)',
     'Confirmar que está bien configurada en el proyecto de Cristián.',
     'todo', 'medium', owner_id, null, '{"govbidder","infra"}'),
    ('GitHub Secrets: DATABASE_URL + DIRECT_URL (Content Dashboard)',
     'Configurar para deploy automatizado.',
     'todo', 'medium', owner_id, null, '{"govbidder","infra"}'),

    -- KAVAR launch
    ('Verificar disponibilidad KAVAR (USPTO, INPI AR, Google, LinkedIn)',
     'Antes de pagar el dominio kavar.io y registrar en Doola.',
     'todo', 'urgent', owner_id, today + 1, '{"kavar","legal"}'),
    ('Pagar $343: Doola + dominio kavar.io + Google Workspace',
     'Estrategia híbrida C — cuando cierre primer cliente nuevo.',
     'todo', 'high', owner_id, null, '{"kavar","legal"}'),
    ('Primer post LinkedIn Nace KAVAR',
     'Arrancar generación de contenido público. Semana 26 mayo.',
     'todo', 'high', owner_id, today + 2, '{"kavar","marketing"}'),
    ('Activar Calendly público + email juampi@kavar.io',
     'Una vez tenga el dominio configurado.',
     'todo', 'high', owner_id, null, '{"kavar","setup"}'),
    ('Crear LinkedIn Company Page KAVAR',
     'Para outbound + branding.',
     'todo', 'medium', owner_id, null, '{"kavar","marketing"}'),
    ('Diseñar logo final KAVAR (Figma/Canva)',
     'Combo 5: mint+green+forest + wordmark Inter Bold.',
     'todo', 'medium', owner_id, null, '{"kavar","branding"}'),
    ('Plan de producto Vendly + Nexo (10 preguntas pendientes)',
     'Definir si seguir o pivotear. 5 preguntas por producto.',
     'todo', 'medium', owner_id, null, '{"vendly","estrategia"}'),
    ('Conectar Instagram a Omni',
     'OAuth flow con mi cuenta de IG personal/business.',
     'todo', 'high', owner_id, null, '{"omni","setup"}');

  raise notice '✅ 20 tasks inserted';

  -- ── 9. Business docs ────────────────────────────────────────
  -- Note: business_docs has no 'base' category, 'content' column, or 'title' unique constraint.
  -- We use category='other', summary for content preview, metadata for full content.
  -- Skip if title already exists.

  insert into public.business_docs (title, category, file_url, file_type, summary, tags)
  select title, 'other', 'inline', 'text', summary, '{}'
  from (values
    ('Misión KAVAR',
     'Liberar a founders del caos operativo para que se enfoquen en crecer.'),
    ('Visión KAVAR',
     'Ser el sistema operativo predeterminado para empresas digitales de habla hispana en LATAM y USA.'),
    ('ICP de Omni',
     'Founders y dueños de: Coaches / infoproductores, Founders SaaS, Dueños de agencia, E-commerce, Consultores premium. Pueden invertir $4K setup + $500/mes.'),
    ('Oferta Omni',
     'SETUP: $4,000 USD (one-time) — instalación completa. MANTENIMIENTO: $500 USD/mes — soporte + mejoras + Slack.'),
    ('Stack KAVAR (mayo 2026)',
     '~$196/mes: Notion+Calendly $25, Claude Pro $20, Cursor $20, Google Workspace $7, LinkedIn $99, Doola $25. Infra: Vercel Hobby + Supabase Free.')
  ) as d(title, summary)
  where not exists (
    select 1 from public.business_docs bd where bd.title = d.title
  );

  raise notice '📚 Business docs inserted';

  -- ── 10. Announcements ───────────────────────────────────────
  insert into public.announcements (title, body, is_pinned)
  select title, body, pinned
  from (values
    ('⚠️ URGENTE: Smart Scale sin RLS',
     'Ann tiene RLS desactivado en producción y anon key con todos los privilegios. Phase B (backup) antes del 26/5, Phase C (RLS) antes del 28/5.',
     true),
    ('🚀 KAVAR entra en modo lanzamiento',
     'Omni v1.0 listo para mostrar. Meta: primer cliente nuevo antes del 7/6. Primer post LinkedIn semana del 26/5.',
     true),
    ('💰 MRR actual: $2,000/mes',
     'Ann $1,500 + GovBidder $500. Renegociación GovBidder el 1/6 → target $1,000-1,500. Post Phase C: Ann sube a $2,000.',
     false)
  ) as a(title, body, pinned)
  where not exists (
    select 1 from public.announcements an where an.title = a.title
  );

  raise notice '📢 Announcements inserted';

  -- ── 11. GovBidder historical launch ─────────────────────────
  if not exists (select 1 from public.launches where name = 'GovBidder — Portal 4 días') then
    insert into public.launches (
      name, description, status, start_date, end_date,
      target_revenue, actual_revenue, participant_count,
      coupon_code, coupon_discount_pct
    ) values (
      'GovBidder — Portal 4 días',
      'Cohorte sincrónica de 4 días con clases en vivo + tareas diarias + cupones automáticos. Lanzamiento del producto de licitaciones.',
      'closed', '2026-04-15', '2026-04-18',
      10000, 0, 0,
      'EARLY30', 30
    ) returning id into launch_id;
    raise notice '🚀 Launch GovBidder created: %', launch_id;
  else
    raise notice '🚀 Launch GovBidder already exists';
  end if;

  -- ── 12. Automations ─────────────────────────────────────────
  insert into public.automations (name, description, type, status, trigger_config, action_config, cron_expression)
  select name, desc_, type_, 'active', trigger_cfg::jsonb, action_cfg::jsonb, cron_expr
  from (values
    ('Refresh Instagram Token',
     'Refresca el long-lived token de IG antes de que expire (cada día a las 3am UTC).',
     'cron',
     '{"schedule":"0 3 * * *","description":"Diario 3am UTC"}',
     '{"type":"refresh_ig_token","endpoint":"/api/cron/instagram-sync"}',
     '0 3 * * *'),
    ('Publicar posts programados IG',
     'Revisa la cola de publicación y publica los posts cuyo scheduled_for ya pasó.',
     'cron',
     '{"schedule":"*/5 * * * *","description":"Cada 5 minutos"}',
     '{"type":"publish_scheduled_ig","endpoint":"/api/cron/ig-publish"}',
     '*/5 * * * *'),
    ('Procesar webhooks IG',
     'Procesa eventos pendientes de Instagram Webhooks (comments, DMs, mentions).',
     'cron',
     '{"schedule":"* * * * *","description":"Cada 1 minuto"}',
     '{"type":"process_ig_webhooks","endpoint":"/api/cron/ig-webhooks"}',
     '* * * * *'),
    ('Backup diario Supabase',
     'Snapshot diario de la DB. Actualmente en free tier — habilitar pg_dump cuando se pague pro.',
     'cron',
     '{"schedule":"0 4 * * *","description":"Diario 4am UTC"}',
     '{"type":"backup_db","note":"Manual hasta tier pro"}',
     '0 4 * * *')
  ) as a(name, desc_, type_, trigger_cfg, action_cfg, cron_expr)
  where not exists (
    select 1 from public.automations au where au.name = a.name
  );

  raise notice '🤖 Automations inserted';

  raise notice '─────────────────────────────────────';
  raise notice '✅ SEED REAL COMPLETADO — KAVAR LLC';
  raise notice '   Clientes: Ann, GovBidder, Vendly, Spriovanni';
  raise notice '   Revenue: 15 records (14 months)';
  raise notice '   Expenses: 18 records (3 months x 6 items)';
  raise notice '   Tasks: 20 real tasks';
  raise notice '   Docs: 5 business docs';
  raise notice '   Launch: GovBidder 4 días';
  raise notice '   Automations: 4 active';
  raise notice '─────────────────────────────────────';

end $$;
