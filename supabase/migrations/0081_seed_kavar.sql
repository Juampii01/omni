-- ============================================================
-- Omni — Migration 008 — KAVAR Seed (reemplaza 006 LM Mentoring)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- DESTRUCTIVO: borra el seed previo de LM Mentoring y carga
-- la data real de KAVAR (negocio + Etapa 1 founder solo).
--
-- NO toca: auth.users, profiles (solo actualiza el owner),
-- client_settings (solo UPDATE).
-- ============================================================

DO $$
DECLARE
  owner_id    uuid;
  dept_cto_id uuid;
  dept_coo_id uuid;
  dept_cco_id uuid;
BEGIN
  -- Owner = perfil más antiguo (= Juampi)
  SELECT id INTO owner_id FROM profiles ORDER BY created_at ASC LIMIT 1;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'No hay perfil. Creá una cuenta primero.';
  END IF;

  -- ═══ LIMPIEZA: borrar seed previo ════════════════════════════
  DELETE FROM messages;
  DELETE FROM channel_members;
  DELETE FROM channels;
  DELETE FROM discovery_responses;
  DELETE FROM discovery_forms;
  DELETE FROM content_pieces;
  DELETE FROM competitors;
  DELETE FROM lead_activities;
  DELETE FROM tasks;
  DELETE FROM leads;
  DELETE FROM kpis;
  DELETE FROM announcements;
  UPDATE profiles SET department_id = NULL;
  DELETE FROM departments;

  -- ═══ client_settings (KAVAR) ════════════════════════════════
  UPDATE client_settings SET
    business_name         = 'KAVAR',
    brand_color           = '#236461',
    brand_accent_color    = '#4ECDC4',
    currency              = 'USD',
    timezone              = 'America/Argentina/Buenos_Aires',
    onboarding_completed  = true,
    ai_credits_limit      = 100000;

  IF NOT FOUND THEN
    INSERT INTO client_settings (
      business_name, brand_color, brand_accent_color, currency, timezone, onboarding_completed
    ) VALUES (
      'KAVAR', '#236461', '#4ECDC4', 'USD', 'America/Argentina/Buenos_Aires', true
    );
  END IF;

  -- ═══ Perfil owner (Juampi) ═════════════════════════════════
  UPDATE profiles SET
    full_name = 'Juampi Acosta',
    role      = 'owner'
  WHERE id = owner_id;

  -- ═══ departments (3 funcionales — Etapa 1) ═════════════════
  INSERT INTO departments (name, description, color, icon, position) VALUES
    ('CTO — Producto',     'Construcción y mantenimiento de Omni y otros productos KAVAR', '#10b981', 'code',         1),
    ('COO — Operaciones',  'Onboarding, soporte y operación de clientes activos',          '#3b82f6', 'settings',     2),
    ('CCO — Ventas',       'LinkedIn outbound, discoveries, propuestas y cierres',         '#f97316', 'trending-up',  3);

  SELECT id INTO dept_cto_id FROM departments WHERE name = 'CTO — Producto';
  SELECT id INTO dept_coo_id FROM departments WHERE name = 'COO — Operaciones';
  SELECT id INTO dept_cco_id FROM departments WHERE name = 'CCO — Ventas';

  -- Asignar Juampi al CCO (donde más tiempo está hoy según el organigrama)
  UPDATE profiles SET department_id = dept_cco_id WHERE id = owner_id;

  -- ═══ KPIs (basados en docs reales de KAVAR) ════════════════
  -- Revenue / MRR — progresión $0 → $500 → $2,000
  INSERT INTO kpis (period_month, category, metric_name, metric_value, metric_target, unit, notes) VALUES
    ('2025-12-01','revenue','MRR',         0, 500,'USD','KAVAR pre-launch, sin clientes activos'),
    ('2026-01-01','revenue','MRR',       500, 750,'USD','Primer cliente: GovBidder ($500/mes)'),
    ('2026-02-01','revenue','MRR',       500,1000,'USD','Construyendo Smart Scale'),
    ('2026-03-01','revenue','MRR',      2000,1500,'USD','Cierre Ann Sahakyan (+$1,500/mes)'),
    ('2026-04-01','revenue','MRR',      2000,2000,'USD','Estable mientras se prepara Phase B/C'),
    ('2026-05-01','revenue','MRR',      2000,2500,'USD','Target Q3 2026: $5,000 — falta cerrar 2 deals');

  -- ARR + métricas mayo
  INSERT INTO kpis (period_month, category, metric_name, metric_value, metric_target, unit, notes) VALUES
    ('2026-05-01','revenue','ARR',      24000,30000,'USD','MRR × 12'),
    ('2026-05-01','revenue','New MRR',      0, 1000,'USD','Sin cierres en mayo aún'),
    ('2026-05-01','revenue','Setup Revenue',0, 5000,'USD','Sin setups nuevos en mayo'),
    ('2026-03-01','revenue','New MRR',   1500,  500,'USD','Ann Sahakyan cerró en marzo'),
    ('2026-03-01','revenue','Setup Revenue',5000,5000,'USD','Setup Ann pagado ($5k)'),
    ('2026-01-01','revenue','Setup Revenue',5000,5000,'USD','Setup GovBidder pagado');

  -- Sales / Customers
  INSERT INTO kpis (period_month, category, metric_name, metric_value, metric_target, unit, notes) VALUES
    ('2025-12-01','sales','Clientes activos',  0,1,'count', null),
    ('2026-01-01','sales','Clientes activos',  1,2,'count','GovBidder onboarded'),
    ('2026-02-01','sales','Clientes activos',  1,2,'count', null),
    ('2026-03-01','sales','Clientes activos',  2,3,'count','+ Ann Sahakyan'),
    ('2026-04-01','sales','Clientes activos',  2,3,'count', null),
    ('2026-05-01','sales','Clientes activos',  2,4,'count','Target Q3: 4-5 clientes'),
    ('2026-05-01','sales','ARPU',           1000, 700,'USD','$2,000 / 2 clientes — sobre target Y1'),
    ('2026-05-01','sales','Pipeline value',47500,30000,'USD','10 leads activos en distintas etapas'),
    ('2026-05-01','sales','Discovery calls',   3,   8,'count','Target Q3 2026: 30 trimestrales'),
    ('2026-05-01','sales','Conversion rate',   0,  30,'percent','Sin cierres en mayo');

  -- Retention
  INSERT INTO kpis (period_month, category, metric_name, metric_value, metric_target, unit, notes) VALUES
    ('2026-03-01','retention','Churn rate',     0,5,'percent', null),
    ('2026-04-01','retention','Churn rate',     0,5,'percent', null),
    ('2026-05-01','retention','Churn rate',     0,5,'percent','0 cancelaciones (target <5%)'),
    ('2026-05-01','retention','Customer Health',75,80,'score','Ann en amarillo por bug RLS pendiente'),
    ('2026-05-01','retention','NPS',         null,50,'score','Pendiente primera encuesta trimestral');

  -- Growth / Marketing
  INSERT INTO kpis (period_month, category, metric_name, metric_value, metric_target, unit, notes) VALUES
    ('2026-03-01','growth','LinkedIn followers',320, 400,'count', null),
    ('2026-04-01','growth','LinkedIn followers',380, 500,'count', null),
    ('2026-05-01','growth','LinkedIn followers',450, 700,'count','Target Q3 2026'),
    ('2026-05-01','marketing','CAC',              0, 500,'USD','Todo orgánico, $0 en paid ads');

  -- ═══ Leads ═════════════════════════════════════════════════
  -- Won (2 reales — Ann + Cristián)
  INSERT INTO leads (full_name, email, phone, source, stage, amount, assigned_to, department_id, notes, closed_at, created_at) VALUES
    ('Ann Sahakyan', 'ann@smartscale.example', '+1 555-0101', 'Referido', 'won', 1500, owner_id, dept_cco_id,
     'Smart Scale — dashboard competitive intelligence. MRR $1,500/mes. Setup pagado (legacy). Status: activa pero con bugs pendientes — RLS desactivado y sin backups (Phase B+C urgente). Target: subir a $2,000/mes post Phase C. Comunicación: email + Loom, review semanal.',
     '2026-03-15 14:00:00'::timestamptz, '2026-02-20 10:00:00'::timestamptz),
    ('Cristián — GovBidder', 'cristian@govbidder.example', '+54 9 11 5555-0202', 'Referido', 'won', 500, owner_id, dept_cco_id,
     'GovBidder Dashboard — gestión de licitaciones públicas. Cristián = punto de contacto principal, Santo = usuario adicional. MRR $500/mes estable. Renegociación programada para 1/6/2026 (target $1,000-1,500). Bugs Loom pendientes: pop-up sesión, selector cliente, conectar IG, botón TikTok. Comunicación: WhatsApp + Loom.',
     '2026-01-10 11:00:00'::timestamptz, '2025-12-15 16:00:00'::timestamptz);

  -- Pipeline activo (10 sintéticos plausibles, tag 'demo' para distinguir)
  -- Mix: 70% Foundation ($5,500 ACV), 25% Growth ($8,250), 5% Scale (no incluido en estos 10)
  INSERT INTO leads (full_name, email, phone, source, stage, amount, assigned_to, department_id, notes, tags, created_at) VALUES
    -- NEW (3)
    ('Martín Saluzzi','martin.s@example.com','+54 9 11 5555-1001','LinkedIn','new',5500,owner_id,dept_cco_id,
     'LinkedIn outbound (mensaje del 21/5). Founder agencia digital, ~$30k MRR. Respondió "me interesa, contame más". Foundation tier probable.',
     ARRAY['demo','linkedin-outbound','foundation'], now()-'2 days'::interval),
    ('Carolina Méndez','carolina.m@example.com','+54 9 11 5555-1002','LinkedIn','new',5500,owner_id,dept_cco_id,
     'LinkedIn outbound. Consultora HR independiente. Pidió info por DM. Sin equipo, probablemente Foundation.',
     ARRAY['demo','linkedin-outbound','foundation'], now()-'4 days'::interval),
    ('Diego Bonetto','diego.b@example.com','+54 9 11 5555-1003','Contenido orgánico','new',8250,owner_id,dept_cco_id,
     'Comentó en el post sobre stack ($3,200/mes en SaaS). Founder e-commerce ~$50k MRR, 8 personas. Growth tier probable.',
     ARRAY['demo','contenido','growth'], now()-'1 day'::interval),
    -- QUALIFIED (2)
    ('Lucas Iturri','lucas.i@example.com','+54 9 11 5555-2001','Referido','qualified',5500,owner_id,dept_cco_id,
     'Referido por Cristián (GovBidder). Founder SaaS B2B, 8 personas. Discovery agendado para esta semana.',
     ARRAY['demo','referido','foundation'], now()-'7 days'::interval),
    ('María Vega','maria.v@example.com','+54 9 11 5555-2002','Contenido orgánico','qualified',5500,owner_id,dept_cco_id,
     'Bajó el lead magnet del Brand Voice. Consultora marketing 4 personas. Fit Foundation claro.',
     ARRAY['demo','contenido','foundation'], now()-'10 days'::interval),
    -- MEETING_SCHEDULED (2)
    ('Hernán Ríos','hernan.r@example.com','+54 9 11 5555-3001','LinkedIn','meeting_scheduled',8250,owner_id,dept_cco_id,
     'Discovery agendado jueves 16hs. Founder agencia branding, 12 personas, $60k MRR. Growth tier probable.',
     ARRAY['demo','linkedin-outbound','growth'], now()-'12 days'::interval),
    ('Sofía Arregui','sofia.a@example.com','+54 9 11 5555-3002','Referido','meeting_scheduled',5500,owner_id,dept_cco_id,
     'Referida por contacto de Juampi. Discovery viernes 11hs. Founder solo, ~$25k MRR. Foundation.',
     ARRAY['demo','referido','foundation'], now()-'8 days'::interval),
    -- MEETING_DONE (2)
    ('Tomás Beltrán','tomas.b@example.com','+54 9 11 5555-4001','LinkedIn','meeting_done',8250,owner_id,dept_cco_id,
     'Discovery hecho. Pidió tiempo para hablarlo con su socia. Agencia $50k MRR, 10 personas. Follow-up lunes.',
     ARRAY['demo','linkedin-outbound','growth'], now()-'15 days'::interval),
    ('Andrea Casals','andrea.c@example.com','+54 9 11 5555-4002','Contenido orgánico','meeting_done',5500,owner_id,dept_cco_id,
     'Discovery hecho. Muy interesada, pidió demo del producto. Coach con $35k MRR.',
     ARRAY['demo','contenido','foundation'], now()-'18 days'::interval),
    -- PROPOSAL_SENT (1)
    ('Roberto Lugones','roberto.l@example.com','+54 9 11 5555-5001','LinkedIn','proposal_sent',5500,owner_id,dept_cco_id,
     'Propuesta Foundation enviada hace 4 días. Founder agencia legal-tech. Status: evaluando con su CTO.',
     ARRAY['demo','linkedin-outbound','foundation'], now()-'22 days'::interval);

  -- ═══ Tasks ═════════════════════════════════════════════════
  -- URGENTES — Smart Scale
  INSERT INTO tasks (title, description, status, priority, created_by, assigned_to, department_id, due_date, tags) VALUES
    ('🔥 Phase B: backup pg_dump → R2 (Smart Scale)',
     'Antes de cualquier otra cosa de Ann. Sin backup no se puede activar RLS sin riesgo. Bloqueante para subir precio a $2k.',
     'in_progress','urgent',owner_id,owner_id,dept_cto_id, now()::date::timestamptz, ARRAY['smart-scale','seguridad','cliente:ann']),
    ('🔥 Phase C: REVOKE anon + activar RLS (Smart Scale)',
     'Después de Phase B confirmada. Cliente Ann lleva semanas con RLS desactivado.',
     'todo','urgent',owner_id,owner_id,dept_cto_id, (now()+'2 days'::interval)::date::timestamptz, ARRAY['smart-scale','seguridad','cliente:ann']),
    ('Subir precio Ann a $2,000/mes (post Phase C)',
     'Mensaje a Ann con la justificación: RLS activado, backups diarios, soporte continuo. Comm template en KAVAR-OS.',
     'backlog','high',owner_id,owner_id,dept_coo_id, (now()+'10 days'::interval)::date::timestamptz, ARRAY['smart-scale','upsell','cliente:ann']);

  -- GovBidder
  INSERT INTO tasks (title, description, status, priority, created_by, assigned_to, department_id, due_date, tags) VALUES
    ('Renegociación GovBidder 1/6/2026',
     'Subir de $500 → $1,000-1,500/mes. Cristián como punto de contacto. Justificar con bugs resueltos + nuevas features (IG, TikTok).',
     'todo','high',owner_id,owner_id,dept_coo_id, '2026-06-01 10:00:00'::timestamptz, ARRAY['govbidder','renegociacion','cliente:cristian']),
    ('Responder Loom de Cristián (Wispr Flow)',
     'Mandar respuesta consolidada con timeline de resoluciones de los 4 bugs.',
     'todo','high',owner_id,owner_id,dept_coo_id, (now()+'1 day'::interval)::date::timestamptz, ARRAY['govbidder','comunicacion']),
    ('Bug: Pop-up sesión (GovBidder)',
     'Reportado por Cristián via Loom. Pop-up de sesión aparece donde no debe.',
     'todo','medium',owner_id,owner_id,dept_cto_id, (now()+'5 days'::interval)::date::timestamptz, ARRAY['govbidder','bug']),
    ('Bug: Selector de cliente (GovBidder)',
     'Reportado por Cristián. UX del selector falla con muchos clientes en lista.',
     'todo','medium',owner_id,owner_id,dept_cto_id, (now()+'5 days'::interval)::date::timestamptz, ARRAY['govbidder','bug']),
    ('Feature: Conectar Instagram (GovBidder)',
     'Pendiente integrar Instagram al dashboard. Cristián lo pidió en Loom.',
     'todo','medium',owner_id,owner_id,dept_cto_id, (now()+'7 days'::interval)::date::timestamptz, ARRAY['govbidder','feature']),
    ('Feature: Botón TikTok (GovBidder)',
     'Pendiente agregar botón TikTok al dashboard.',
     'todo','medium',owner_id,owner_id,dept_cto_id, (now()+'7 days'::interval)::date::timestamptz, ARRAY['govbidder','feature']),
    ('Verificar OAUTH_TOKEN_ENCRYPTION_KEY en Vercel (GovBidder)',
     'Confirmar que está seteada correctamente en el deploy de producción.',
     'todo','medium',owner_id,owner_id,dept_cto_id, (now()+'2 days'::interval)::date::timestamptz, ARRAY['govbidder','infra']),
    ('Verificar GitHub Secrets en Content Dashboard',
     'DATABASE_URL + DIRECT_URL pendientes de validación.',
     'backlog','low',owner_id,owner_id,dept_cto_id, null, ARRAY['govbidder','infra']);

  -- Lanzamiento KAVAR
  INSERT INTO tasks (title, description, status, priority, created_by, assigned_to, department_id, due_date, tags) VALUES
    ('Subdomain kavar.io activo',
     'Configurar DNS + SSL. Pre-requisito del resto del lanzamiento.',
     'in_progress','high',owner_id,owner_id,dept_cto_id, (now()+'3 days'::interval)::date::timestamptz, ARRAY['lanzamiento','infra']),
    ('LinkedIn Company Page KAVAR',
     'Crear página de empresa con banner, logo, descripción según Brand System.',
     'todo','high',owner_id,owner_id,dept_cco_id, (now()+'5 days'::interval)::date::timestamptz, ARRAY['lanzamiento','linkedin']),
    ('Primer post LinkedIn "Nace KAVAR"',
     'Anuncio oficial. Semana del 26 mayo. Tono: confiado, directo, sin BS.',
     'todo','high',owner_id,owner_id,dept_cco_id, '2026-05-26 10:00:00'::timestamptz, ARRAY['lanzamiento','contenido','linkedin']),
    ('Activar Calendly público (juampi@kavar.io)',
     'Link de discovery 30 min. Configurar tipos de eventos + redirect post-booking.',
     'todo','medium',owner_id,owner_id,dept_cco_id, (now()+'7 days'::interval)::date::timestamptz, ARRAY['lanzamiento','calendly']),
    ('Comenzar outbound LinkedIn — 10 mensajes/día',
     'SDR mode. Target Q3 2026: 600 outbound contacts → 30 discoveries → 3 deals. Empezar 1/6.',
     'todo','medium',owner_id,owner_id,dept_cco_id, '2026-06-01 09:00:00'::timestamptz, ARRAY['lanzamiento','outbound']);

  -- Done (para que el kanban no se vea vacío)
  INSERT INTO tasks (title, description, status, priority, created_by, assigned_to, department_id, completed_at) VALUES
    ('Cerrar Ann Sahakyan ($1,500/mes)',
     'Smart Scale dashboard. Setup $5k pagado. Inicio rolling mensual.',
     'done','high',owner_id,owner_id,dept_cco_id, '2026-03-15 14:00:00'::timestamptz),
    ('Cerrar GovBidder ($500/mes)',
     'Primer cliente de KAVAR. Cristián como contacto principal, Santo como user adicional.',
     'done','high',owner_id,owner_id,dept_cco_id, '2026-01-10 11:00:00'::timestamptz),
    ('Definir Brand System KAVAR (colores, voice, tono)',
     'Kavar Green #236461, Kavar Mint #4ECDC4, Inter font. Documentado en KAVAR-OS.',
     'done','medium',owner_id,owner_id,dept_cco_id, '2026-05-22 18:00:00'::timestamptz),
    ('LLC Wyoming + Mercury + Stripe operativos',
     'Estructura legal completa. Doola, EIN, banca operativa. Listo para facturar.',
     'done','high',owner_id,owner_id,dept_coo_id, '2026-04-15 12:00:00'::timestamptz),
    ('KAVAR-OS v1 (knowledge base completo)',
     '20 carpetas con identidad, branding, ventas, finanzas, métricas. Última actualización 22/5.',
     'done','medium',owner_id,owner_id,dept_coo_id, '2026-05-22 20:00:00'::timestamptz);

  -- ═══ Competitors ═══════════════════════════════════════════
  INSERT INTO competitors (name, category, website_url, notes, tags, added_by) VALUES
    ('Notion','Productividad / wiki','notion.so',
     'Lo que muchos founders usan como "dashboard improvisado". $8-15/usuario/mes. Súper flexible pero no es operativo: no tiene CRM real, ni KPIs trackeables, ni IA contextual del negocio. Es la herramienta a la que reemplazamos más seguido.',
     ARRAY['no-code','flexible','no-operativo'], owner_id),
    ('Monday.com','Project management','monday.com',
     '$10-24/usuario/mes. Mejor que Notion para ops pero genérico, no específico para founders digitales. Sin IA contextual del negocio. Curva de implementación larga.',
     ARRAY['pm','enterprise','generico'], owner_id),
    ('ClickUp','All-in-one','clickup.com',
     '$7-19/usuario/mes. Compite por ser "todo en uno" pero termina siendo muy complejo. Curva de aprendizaje alta. Usuarios terminan usando solo el 20% de las features.',
     ARRAY['all-in-one','complejo'], owner_id),
    ('Airtable','Database visual','airtable.com',
     '$10-20/usuario/mes. Más DB que dashboard. Founders lo usan como CRM rudimentario pero no escala bien. Hermoso pero requiere mucho setup manual.',
     ARRAY['database','crm-light'], owner_id),
    ('Linear','Issue tracking','linear.app',
     '$8-14/usuario/mes. Premium para devs/producto. Excelente en lo suyo pero no apunta a founders generalistas. No es competidor directo, pero comparte el espacio "premium operativo".',
     ARRAY['devs','producto','premium'], owner_id);

  -- ═══ Content pieces ═══════════════════════════════════════
  INSERT INTO content_pieces (title, description, format, platform, status, scheduled_for, tags, created_by) VALUES
    ('Nace KAVAR',
     'Post de lanzamiento oficial. "KAVAR es la empresa que opera el backend de los negocios digitales." Tono confiado, directo, sin BS según Brand System.',
     'post','linkedin','scheduled','2026-05-26 10:00:00'::timestamptz,
     ARRAY['lanzamiento','kavar'], owner_id),
    ('Esta semana cerré un cliente Omni que pagaba $3,200/mes en SaaS',
     'Storytime real: reemplacé 12 herramientas con un dashboard custom en 4 semanas. Setup en 4 semanas. Cada caso es distinto pero el patrón se repite.',
     'post','linkedin','draft',null,
     ARRAY['caso','social-proof','omni'], owner_id),
    ('Por qué los founders ahogados en herramientas no necesitan MÁS herramientas',
     'Tesis central de KAVAR en formato post largo. Loss aversion: el costo de NO hacer nada > el costo del producto.',
     'article','linkedin','idea',null,
     ARRAY['posicionamiento','tesis'], owner_id),
    ('El stack típico del founder digital: $2,500/mes que no se hablan entre sí',
     'Carrusel 7 slides: Notion + Trello + Calendly + Stripe + Mailchimp + Zapier + ... → Omni los reemplaza.',
     'carousel','linkedin','idea',null,
     ARRAY['educativo','stack','omni'], owner_id),
    ('Demo de Omni en 60 segundos',
     'Video walkthrough del producto. Para usar en propuestas y outbound. Mostrar Dashboard + CRM + KPIs + IA.',
     'video','linkedin','idea',null,
     ARRAY['demo','producto','omni'], owner_id);

  -- ═══ Channels + mensajes ═══════════════════════════════════
  INSERT INTO channels (name, description, is_private, created_by) VALUES
    ('general',  'Canal principal — anuncios y updates de KAVAR',         false, owner_id),
    ('clientes', 'Updates sobre clientes activos (Ann, GovBidder)',       false, owner_id),
    ('producto', 'Bugs, features y deploys de Omni',                      false, owner_id),
    ('ventas',   'Pipeline, discoveries, propuestas, cierres',            false, owner_id);

  INSERT INTO messages (channel_id, user_id, content, created_at)
  SELECT c.id, owner_id, t.msg, t.ts
  FROM channels c
  JOIN (VALUES
    ('general',  'KAVAR oficialmente operativo. LLC Wyoming + Mercury + Stripe listos. Primer cliente real cerrado en enero.',          now()-'45 days'::interval),
    ('general',  'KAVAR-OS v1 completo: 20 carpetas, knowledge base entero. Esto es el OS antes del OS.',                                now()-'2 days'::interval),
    ('general',  'Plan Q3 2026: llegar a $5k MRR. Hoy estamos en $2k. Camino: subir Ann + renegociar GovBidder + cerrar 2 deals.',     now()-'7 days'::interval),
    ('clientes', '🚨 Smart Scale (Ann): Phase B (backup pg_dump → R2) sigue pendiente. Sin backup no puedo activar RLS sin riesgo. Esta semana, sí o sí.', now()-'3 days'::interval),
    ('clientes', 'GovBidder (Cristián + Santo): renegociación agendada 1/6/2026. Target: $1,000-1,500/mes. Resolver bugs Loom antes.', now()-'5 days'::interval),
    ('producto', 'Omni: deployados los 3 fixes prioritarios (créditos IA enforced, onboarding wizard, charts KPIs con Recharts). En prod.', now()-'1 day'::interval),
    ('producto', 'Omni: pendientes según audit → sub-páginas de Settings, detalle de lead, persistencia historial IA. Backlog.',         now()-'6 hours'::interval),
    ('ventas',   'Outbound LinkedIn arranca 1/6 — 10 mensajes/día. Target Q3: 600 contactos → 30 discoveries → 3 deals cerrados.',     now()-'2 days'::interval),
    ('ventas',   'Pipeline actual: 10 leads activos. 3 new, 2 qualified, 2 meeting scheduled, 2 meeting done, 1 proposal sent.',         now()-'1 day'::interval)
  ) AS t(channel_name, msg, ts) ON c.name = t.channel_name;

  -- ═══ Discovery form ═══════════════════════════════════════
  INSERT INTO discovery_forms (title, description, questions, is_active, created_by)
  VALUES (
    'Discovery KAVAR — Omni Foundation',
    'Antes de la llamada de 30 min, contame un poco de tu negocio. Esto me permite preparar la conversación y darte recomendaciones reales, no genéricas.',
    '[
      {"id":"q1","type":"text","question":"Nombre completo y a qué se dedica tu negocio","required":true},
      {"id":"q2","type":"text","question":"¿Cuánto facturás mensualmente (MRR aproximado)?","required":true},
      {"id":"q3","type":"choice","question":"¿Cuántas personas son en el equipo?","options":["Solo yo","2-3","4-10","11+"],"required":true},
      {"id":"q4","type":"textarea","question":"¿Cuáles son las 3-5 herramientas que más usás hoy para operar el negocio?","required":true},
      {"id":"q5","type":"textarea","question":"¿Cuántas horas al mes calculás que perdés en tareas operativas que podrían automatizarse?","required":true},
      {"id":"q6","type":"rating","question":"Del 1 al 5, ¿qué tan urgente es para vos resolver esto?","required":true},
      {"id":"q7","type":"choice","question":"Inversión estimada que estás dispuesto a hacer","options":["Menos de $5k","$5k-15k setup + $500-1k/mes","$15k+ setup + $1k+/mes","Aún no lo definí"],"required":true},
      {"id":"q8","type":"textarea","question":"¿Algo más que quieras contarme antes de la call?","required":false}
    ]'::jsonb,
    true,
    owner_id
  );

  -- ═══ Announcements (3 pinned) ═════════════════════════════
  INSERT INTO announcements (title, body, is_pinned, created_by) VALUES
    ('Bienvenido a KAVAR OS',
     'Este dashboard es el sistema operativo de KAVAR. Tracking de clientes, KPIs, pipeline, tareas y comunicación interna en un solo lugar. El producto que estás usando es Omni — el mismo que vendemos a clientes (con su data en lugar de la nuestra).',
     true, owner_id),
    ('Plan Q3 2026: llegar a $5k MRR',
     'Camino concreto: (1) subir Ann a $2,000/mes post Phase C de Smart Scale, (2) renegociar GovBidder a $1,000-1,500/mes el 1/6, (3) cerrar 2 nuevos Foundation deals. Tracker en KPIs.',
     true, owner_id),
    ('🔥 URGENTE: Phase B/C Smart Scale pendiente',
     'Ann lleva semanas con RLS desactivado y sin backups. Esta semana: pg_dump → R2 + REVOKE anon + activar RLS. Bloqueante para subir precio y para dormir tranquilo.',
     true, owner_id);

  RAISE NOTICE '✅ KAVAR seed completo. Owner: %', owner_id;

END $$;
