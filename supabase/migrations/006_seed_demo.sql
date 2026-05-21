-- ============================================================
-- Omni — Migration 006 — Demo Seed (LM Mentoring)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Idempotente: verifica conteo antes de insertar.
-- ============================================================

DO $$
DECLARE
  owner_id uuid;
BEGIN
  -- Obtener el perfil owner (el más antiguo)
  SELECT id INTO owner_id FROM profiles ORDER BY created_at ASC LIMIT 1;
  IF owner_id IS NULL THEN
    RAISE NOTICE 'No se encontró ningún perfil. Creá una cuenta primero.';
    RETURN;
  END IF;

  -- ─── Client settings ─────────────────────────────────────────
  UPDATE client_settings SET
    business_name         = 'LM Mentoring',
    brand_color           = '#236461',
    currency              = 'USD',
    timezone              = 'America/Argentina/Buenos_Aires',
    onboarding_completed  = true;

  IF NOT FOUND THEN
    INSERT INTO client_settings (business_name, brand_color, currency, timezone, onboarding_completed)
    VALUES ('LM Mentoring', '#236461', 'USD', 'America/Argentina/Buenos_Aires', true);
  END IF;

  -- ─── KPIs — 12 meses MRR + Alumnos ──────────────────────────
  -- Solo inserta si hay menos de 5 KPIs (evita duplicados)
  IF (SELECT COUNT(*) FROM kpis) < 5 THEN

    INSERT INTO kpis (period_month, category, metric_name, metric_value, metric_target, unit) VALUES
      ('2025-06-01','revenue','MRR',5400,5000,'USD'),
      ('2025-07-01','revenue','MRR',9000,8000,'USD'),
      ('2025-08-01','revenue','MRR',10800,10000,'USD'),
      ('2025-09-01','revenue','MRR',9000,11000,'USD'),
      ('2025-10-01','revenue','MRR',12600,12000,'USD'),
      ('2025-11-01','revenue','MRR',16200,15000,'USD'),
      ('2025-12-01','revenue','MRR',14400,16000,'USD'),
      ('2026-01-01','revenue','MRR',18000,17000,'USD'),
      ('2026-02-01','revenue','MRR',19800,20000,'USD'),
      ('2026-03-01','revenue','MRR',21600,22000,'USD'),
      ('2026-04-01','revenue','MRR',21600,23000,'USD'),
      ('2026-05-01','revenue','MRR',21600,24000,'USD')
    ON CONFLICT (period_month,category,metric_name,department_id) DO NOTHING;

    INSERT INTO kpis (period_month, category, metric_name, metric_value, metric_target, unit) VALUES
      ('2025-06-01','growth','Alumnos activos',3,4,'count'),
      ('2025-07-01','growth','Alumnos activos',5,6,'count'),
      ('2025-08-01','growth','Alumnos activos',6,7,'count'),
      ('2025-09-01','growth','Alumnos activos',5,7,'count'),
      ('2025-10-01','growth','Alumnos activos',7,8,'count'),
      ('2025-11-01','growth','Alumnos activos',9,10,'count'),
      ('2025-12-01','growth','Alumnos activos',8,10,'count'),
      ('2026-01-01','growth','Alumnos activos',10,11,'count'),
      ('2026-02-01','growth','Alumnos activos',11,12,'count'),
      ('2026-03-01','growth','Alumnos activos',12,14,'count'),
      ('2026-04-01','growth','Alumnos activos',12,14,'count'),
      ('2026-05-01','growth','Alumnos activos',12,15,'count')
    ON CONFLICT (period_month,category,metric_name,department_id) DO NOTHING;

    INSERT INTO kpis (period_month, category, metric_name, metric_value, metric_target, unit) VALUES
      ('2026-05-01','sales','Conversión global',18.4,22,'percent'),
      ('2026-05-01','sales','CAC',385,300,'USD'),
      ('2026-05-01','sales','LTV',4320,5000,'USD'),
      ('2026-05-01','retention','Churn rate',8.3,5,'percent'),
      ('2026-05-01','retention','NPS',67,75,'score'),
      ('2026-05-01','sales','Close rate Diego',35,40,'percent'),
      ('2026-05-01','sales','Leads calificados',47,50,'count'),
      ('2026-05-01','sales','Llamadas realizadas',23,25,'count'),
      ('2026-04-01','sales','Conversión global',16.2,20,'percent'),
      ('2026-04-01','retention','Churn rate',6.5,5,'percent'),
      ('2026-03-01','sales','Conversión global',21.0,22,'percent'),
      ('2026-03-01','retention','Churn rate',4.8,5,'percent')
    ON CONFLICT (period_month,category,metric_name,department_id) DO NOTHING;

  END IF; -- kpis

  -- ─── Leads (60) ──────────────────────────────────────────────
  IF (SELECT COUNT(*) FROM leads) < 10 THEN

    -- NEW (8)
    INSERT INTO leads (full_name,email,phone,source,stage,amount,created_by,notes,created_at) VALUES
      ('Valentina Castro','valentina.castro@gmail.com','+5491155500001','Instagram','new',1800,owner_id,'DM Instagram. Preguntó por el programa premium.',now()-'1 day'::interval),
      ('Martín López','martin.lopez@gmail.com','+5491155500002','Instagram','new',1800,owner_id,'Comentó en el reel de escalamiento.',now()-'2 days'::interval),
      ('Florencia Ramírez','flor.ramirez@gmail.com','+5491155500003','ManyChat','new',1800,owner_id,'Entró por ManyChat, respondió el cuestionario de calificación.',now()-'3 days'::interval),
      ('Tomás Fernández','tomas.f@gmail.com','+5491155500004','Referido','new',3600,owner_id,'Referido directo por alumno activo. Alto potencial.',now()-'2 days'::interval),
      ('Luciana Moreno','luciana.m@hotmail.com','+5491155500005','Instagram','new',1800,owner_id,null,now()-'1 day'::interval),
      ('Emiliano Torres','emiliano.t@gmail.com','+5491155500006','Facebook Ads','new',1800,owner_id,null,now()-'4 days'::interval),
      ('Camila Herrera','c.herrera@gmail.com','+5491155500007','Instagram','new',1800,owner_id,'Emprendedora rubro textil, $3k MRR actual.',now()-'1 day'::interval),
      ('Nicolás Gutiérrez','nicolas.g@gmail.com','+5491155500008','ManyChat','new',1800,owner_id,null,now()-'5 days'::interval);

    -- QUALIFIED (12)
    INSERT INTO leads (full_name,email,phone,source,stage,amount,assigned_to,created_by,notes,last_contact_at,created_at) VALUES
      ('Roberto Sánchez','roberto.s@gmail.com','+5491155500009','Instagram','qualified',1800,owner_id,owner_id,'Consultoría propia, quiere escalar a $15k/mes. Llamada hoy a las 17:30.',now()-'1 hour'::interval,now()-'5 days'::interval),
      ('Daniela Medina','daniela.m@gmail.com','+5491155500010','Instagram','qualified',1800,owner_id,owner_id,'Infoproductora con buen ticket promedio.',now()-'2 days'::interval,now()-'8 days'::interval),
      ('Andrés Villanueva','andres.v@gmail.com','+5491155500011','ManyChat','qualified',1800,owner_id,owner_id,null,now()-'3 days'::interval,now()-'10 days'::interval),
      ('Patricia Salinas','patricia.s@gmail.com','+5491155500012','Referido','qualified',3600,owner_id,owner_id,'Referida por Lucía Vargas. Muy interesada.',now()-'1 day'::interval,now()-'7 days'::interval),
      ('Javier Ortega','javier.o@gmail.com','+5491155500013','Instagram','qualified',1800,owner_id,owner_id,null,now()-'4 days'::interval,now()-'12 days'::interval),
      ('Sofía Mendoza','sofia.me@gmail.com','+5491155500014','Facebook Ads','qualified',1800,owner_id,owner_id,'Agencia de marketing digital, 3 empleados.',now()-'2 days'::interval,now()-'9 days'::interval),
      ('Diego Molina','diego.mol@gmail.com','+5491155500015','Instagram','qualified',1800,owner_id,owner_id,null,now()-'5 days'::interval,now()-'15 days'::interval),
      ('Elena Rojas','elena.r@gmail.com','+5491155500016','ManyChat','qualified',1800,owner_id,owner_id,'Coach de vida, quiere agregar componente de negocios.',now()-'3 days'::interval,now()-'11 days'::interval),
      ('Gustavo Pérez','gustavo.p@gmail.com','+5491155500017','Referido','qualified',5400,owner_id,owner_id,'Empresa de $30k MRR buscando escalar el equipo de ventas.',now()-'1 day'::interval,now()-'6 days'::interval),
      ('Renata Blanco','renata.b@gmail.com','+5491155500018','Instagram','qualified',1800,owner_id,owner_id,null,now()-'6 days'::interval,now()-'14 days'::interval),
      ('Carlos Iglesias','carlos.i@gmail.com','+5491155500019','ManyChat','qualified',1800,owner_id,owner_id,null,now()-'4 days'::interval,now()-'13 days'::interval),
      ('Valeria Espinoza','valeria.e@gmail.com','+5491155500020','Instagram','qualified',1800,owner_id,owner_id,'Muy motivada, lista para agendar.',now()-'2 days'::interval,now()-'8 days'::interval);

    -- MEETING_SCHEDULED (15)
    INSERT INTO leads (full_name,email,phone,source,stage,amount,assigned_to,created_by,notes,last_contact_at,expected_close_date,created_at) VALUES
      ('Mateo Domínguez','mateo.d@gmail.com','+5491155500021','Instagram','meeting_scheduled',3600,owner_id,owner_id,'⚠️ SIN CONTACTO hace 14 días. Agencia de publicidad digital.',now()-'14 days'::interval,(now()+'3 days'::interval)::date,now()-'20 days'::interval),
      ('Laura Castillo','laura.c@gmail.com','+5491155500022','Instagram','meeting_scheduled',1800,owner_id,owner_id,null,now()-'2 days'::interval,(now()+'5 days'::interval)::date,now()-'15 days'::interval),
      ('Pablo Reyes','pablo.r@gmail.com','+5491155500023','Referido','meeting_scheduled',1800,owner_id,owner_id,null,now()-'1 day'::interval,(now()+'2 days'::interval)::date,now()-'12 days'::interval),
      ('Adriana Flores','adriana.f@gmail.com','+5491155500024','ManyChat','meeting_scheduled',1800,owner_id,owner_id,'E-commerce, MRR $8k. Bien calificada.',now()-'3 days'::interval,(now()+'7 days'::interval)::date,now()-'18 days'::interval),
      ('Rodrigo Vega','rodrigo.v@gmail.com','+5491155500025','Facebook Ads','meeting_scheduled',1800,owner_id,owner_id,null,now()-'4 days'::interval,(now()+'4 days'::interval)::date,now()-'16 days'::interval),
      ('Marcela Torres','marcela.t@gmail.com','+5491155500026','Instagram','meeting_scheduled',1800,owner_id,owner_id,null,now()-'5 days'::interval,(now()+'6 days'::interval)::date,now()-'19 days'::interval),
      ('Sebastián Álvarez','sebastian.a@gmail.com','+5491155500027','Instagram','meeting_scheduled',1800,owner_id,owner_id,null,now()-'3 days'::interval,(now()+'3 days'::interval)::date,now()-'14 days'::interval),
      ('Natalia Ríos','natalia.r@gmail.com','+5491155500028','ManyChat','meeting_scheduled',1800,owner_id,owner_id,'Muy interesada en el programa de 6 meses.',now()-'2 days'::interval,(now()+'5 days'::interval)::date,now()-'13 days'::interval),
      ('Fernando Gómez','fernando.g@gmail.com','+5491155500029','Referido','meeting_scheduled',5400,owner_id,owner_id,'Alto potencial. Referido por alumno activo.',now()-'1 day'::interval,(now()+'2 days'::interval)::date,now()-'10 days'::interval),
      ('Isabella García','isabella.g@gmail.com','+5491155500030','Instagram','meeting_scheduled',1800,owner_id,owner_id,null,now()-'6 days'::interval,(now()+'8 days'::interval)::date,now()-'21 days'::interval),
      ('Agustín Romero','agustin.r@gmail.com','+5491155500031','ManyChat','meeting_scheduled',1800,owner_id,owner_id,null,now()-'4 days'::interval,(now()+'6 days'::interval)::date,now()-'17 days'::interval),
      ('Verónica Muñoz','veronica.m@gmail.com','+5491155500032','Facebook Ads','meeting_scheduled',1800,owner_id,owner_id,null,now()-'7 days'::interval,(now()+'9 days'::interval)::date,now()-'22 days'::interval),
      ('Joaquín Suárez','joaquin.s@gmail.com','+5491155500033','Instagram','meeting_scheduled',3600,owner_id,owner_id,'Marca personal fuerte, 15k seguidores.',now()-'3 days'::interval,(now()+'4 days'::interval)::date,now()-'15 days'::interval),
      ('Clara Heredia','clara.h@gmail.com','+5491155500034','Referido','meeting_scheduled',1800,owner_id,owner_id,null,now()-'5 days'::interval,(now()+'7 days'::interval)::date,now()-'20 days'::interval),
      ('Máximo Peralta','maximo.p@gmail.com','+5491155500035','Instagram','meeting_scheduled',1800,owner_id,owner_id,null,now()-'8 days'::interval,(now()+'10 days'::interval)::date,now()-'25 days'::interval);

    -- MEETING_DONE (10)
    INSERT INTO leads (full_name,email,phone,source,stage,amount,assigned_to,created_by,notes,last_contact_at,expected_close_date,created_at) VALUES
      ('Ana Torres','ana.t@gmail.com','+5491155500036','Instagram','meeting_done',1800,owner_id,owner_id,'Llamada excelente. Muy interesada, pidió propuesta. Próx: enviar hoy.',now()-'1 day'::interval,(now()+'3 days'::interval)::date,now()-'15 days'::interval),
      ('Sebastián Romero','sebastian.rom@gmail.com','+5491155500037','Referido','meeting_done',1800,owner_id,owner_id,'5 días sin respuesta post-llamada. Hacer follow-up.',now()-'5 days'::interval,(now()+'5 days'::interval)::date,now()-'18 days'::interval),
      ('Beatriz Solís','beatriz.s@gmail.com','+5491155500038','ManyChat','meeting_done',1800,owner_id,owner_id,'Interesada pero pide más tiempo para decidir.',now()-'3 days'::interval,(now()+'7 days'::interval)::date,now()-'20 days'::interval),
      ('Ricardo Núñez','ricardo.n@gmail.com','+5491155500039','Facebook Ads','meeting_done',3600,owner_id,owner_id,'Emprendedor digital bien calificado. $12k MRR actual.',now()-'2 days'::interval,(now()+'4 days'::interval)::date,now()-'16 days'::interval),
      ('Pilar Aguilar','pilar.a@gmail.com','+5491155500040','Instagram','meeting_done',1800,owner_id,owner_id,null,now()-'4 days'::interval,(now()+'6 days'::interval)::date,now()-'19 days'::interval),
      ('Ezequiel Mora','ezequiel.m@gmail.com','+5491155500041','Instagram','meeting_done',1800,owner_id,owner_id,'Quiere empezar el próximo mes. Muy motivado.',now()-'2 days'::interval,(now()+'5 days'::interval)::date,now()-'14 days'::interval),
      ('Lara Jiménez','lara.j@gmail.com','+5491155500042','ManyChat','meeting_done',1800,owner_id,owner_id,null,now()-'6 days'::interval,(now()+'8 days'::interval)::date,now()-'22 days'::interval),
      ('Hernán Ponce','hernan.p@gmail.com','+5491155500043','Referido','meeting_done',5400,owner_id,owner_id,'Empresa con 5 empleados. Quiere escalar ventas.',now()-'1 day'::interval,(now()+'3 days'::interval)::date,now()-'12 days'::interval),
      ('Cecilia Varela','cecilia.v@gmail.com','+5491155500044','Instagram','meeting_done',1800,owner_id,owner_id,null,now()-'7 days'::interval,(now()+'10 days'::interval)::date,now()-'24 days'::interval),
      ('Bruno Cardozo','bruno.c@gmail.com','+5491155500045','Facebook Ads','meeting_done',1800,owner_id,owner_id,null,now()-'3 days'::interval,(now()+'5 days'::interval)::date,now()-'17 days'::interval);

    -- PROPOSAL_SENT (8)
    INSERT INTO leads (full_name,email,phone,source,stage,amount,assigned_to,created_by,notes,last_contact_at,expected_close_date,created_at) VALUES
      ('Lucía Vargas','lucia.v@gmail.com','+5491155500046','Instagram','proposal_sent',5400,owner_id,owner_id,'Propuesta de 3 meses enviada. Tiene preguntas sobre el metodología.',now()-'3 days'::interval,(now()+'7 days'::interval)::date,now()-'20 days'::interval),
      ('Marco Valdez','marco.val@gmail.com','+5491155500047','Referido','proposal_sent',1800,owner_id,owner_id,null,now()-'4 days'::interval,(now()+'5 days'::interval)::date,now()-'22 days'::interval),
      ('Alejandra Cruz','alejandra.c@gmail.com','+5491155500048','Instagram','proposal_sent',1800,owner_id,owner_id,'Leyó la propuesta, tiene preguntas sobre el programa.',now()-'2 days'::interval,(now()+'6 days'::interval)::date,now()-'18 days'::interval),
      ('Iván Delgado','ivan.d@gmail.com','+5491155500049','ManyChat','proposal_sent',3600,owner_id,owner_id,'Propuesta premium enviada. Evaluando con su socio.',now()-'5 days'::interval,(now()+'8 days'::interval)::date,now()-'25 days'::interval),
      ('Nadia Bravo','nadia.b@gmail.com','+5491155500050','Facebook Ads','proposal_sent',1800,owner_id,owner_id,null,now()-'6 days'::interval,(now()+'9 days'::interval)::date,now()-'26 days'::interval),
      ('Osvaldo Quiroga','osvaldo.q@gmail.com','+5491155500051','Referido','proposal_sent',5400,owner_id,owner_id,'Empresa en crecimiento. Propuesta enterprise enviada.',now()-'3 days'::interval,(now()+'7 days'::interval)::date,now()-'21 days'::interval),
      ('Miriam Fuentes','miriam.f@gmail.com','+5491155500052','Instagram','proposal_sent',1800,owner_id,owner_id,null,now()-'7 days'::interval,(now()+'10 days'::interval)::date,now()-'28 days'::interval),
      ('Leandro Acosta','leandro.a@gmail.com','+5491155500053','Instagram','proposal_sent',1800,owner_id,owner_id,'Quiere arrancar en junio. Esperando confirmación.',now()-'2 days'::interval,(now()+'5 days'::interval)::date,now()-'17 days'::interval);

    -- NEGOTIATION (4)
    INSERT INTO leads (full_name,email,phone,source,stage,amount,assigned_to,created_by,notes,last_contact_at,expected_close_date,created_at) VALUES
      ('Federico Acosta','federico.a@gmail.com','+5491155500054','Referido','negotiation',5400,owner_id,owner_id,'🔥 Llamada de cierre hoy a las 16:30. Muy probable cierre.',now(),'2026-05-21',now()-'25 days'::interval),
      ('Victoria Molina','victoria.m@gmail.com','+5491155500055','Instagram','negotiation',3600,owner_id,owner_id,'Pide descuento por compromiso de 6 meses. En evaluación.',now()-'2 days'::interval,(now()+'3 days'::interval)::date,now()-'22 days'::interval),
      ('Ramiro Estrada','ramiro.e@gmail.com','+5491155500056','Facebook Ads','negotiation',1800,owner_id,owner_id,'Último seguimiento pendiente. Dar urgencia.',now()-'3 days'::interval,(now()+'2 days'::interval)::date,now()-'20 days'::interval),
      ('Lorena Cabrera','lorena.c@gmail.com','+5491155500057','ManyChat','negotiation',5400,owner_id,owner_id,'Empresa de $25k MRR. Alto potencial de cierre.',now()-'1 day'::interval,(now()+'1 day'::interval)::date,now()-'18 days'::interval);

    -- WON (2)
    INSERT INTO leads (full_name,email,phone,source,stage,amount,assigned_to,created_by,notes,last_contact_at,closed_at,created_at) VALUES
      ('Carla Ibáñez','carla.i@gmail.com','+5491155500058','Instagram','won',1800,owner_id,owner_id,'Firmó contrato de 3 meses. Inicio el próximo lunes. 🎉',now()-'5 days'::interval,now()-'5 days'::interval,now()-'30 days'::interval),
      ('Ignacio Correa','ignacio.c@gmail.com','+5491155500059','Referido','won',5400,owner_id,owner_id,'Cerró por 3 meses completos. Excelente predisposición. 💪',now()-'8 days'::interval,now()-'8 days'::interval,now()-'35 days'::interval);

    -- LOST (1)
    INSERT INTO leads (full_name,email,phone,source,stage,amount,assigned_to,created_by,notes,closed_at,created_at) VALUES
      ('Camila Ruiz','camila.ruiz@gmail.com','+5491155500060','Instagram','lost',0,owner_id,owner_id,'Solicitó reembolso en el primer mes. Razón: falta de tiempo. Documentar aprendizajes.',now()-'10 days'::interval,now()-'45 days'::interval);

  END IF; -- leads

  -- ─── Tasks (35) ───────────────────────────────────────────────
  IF (SELECT COUNT(*) FROM tasks) < 5 THEN

    -- BACKLOG (8)
    INSERT INTO tasks (title,description,status,priority,created_by,assigned_to,due_date,tags) VALUES
      ('Crear landing page del programa premium','Copy + diseño para el programa de 6 meses con casos de éxito','backlog','medium',owner_id,owner_id,now()+'14 days'::interval,ARRAY['marketing','web']),
      ('Definir curriculum módulo 4','Estructurar contenido del módulo de operaciones y delegación','backlog','medium',owner_id,owner_id,now()+'21 days'::interval,ARRAY['contenido']),
      ('Investigar plataformas de membresías','Evaluar Hotmart, Kajabi y Teachable para el programa online','backlog','low',owner_id,owner_id,null,ARRAY['tech']),
      ('Crear guía de onboarding v2','Actualizar proceso de bienvenida para nuevos alumnos','backlog','medium',owner_id,owner_id,now()+'30 days'::interval,ARRAY['operaciones']),
      ('Crear programa de referidos formal','Diseñar sistema de incentivos para referidos de alumnos','backlog','medium',owner_id,owner_id,now()+'45 days'::interval,ARRAY['ventas']),
      ('Grabar módulo bonus sobre LinkedIn','Video adicional exclusivo para alumnos activos','backlog','low',owner_id,owner_id,null,ARRAY['contenido']),
      ('Setup tracking automático de leads','Configurar alertas y seguimiento en el CRM','backlog','low',owner_id,owner_id,null,ARRAY['crm','tech']),
      ('Análisis de competencia Q3 2026','Research profundo de los 5 principales competidores','backlog','low',owner_id,owner_id,now()+'60 days'::interval,ARRAY['estrategia']);

    -- TODO (12)
    INSERT INTO tasks (title,description,status,priority,created_by,assigned_to,due_date,tags) VALUES
      ('Cerrar contrato con Federico Acosta','Papelería + link de pago después de la llamada de las 16:30','todo','urgent',owner_id,owner_id,now()::date::timestamptz,ARRAY['ventas']),
      ('Llamada con Roberto Sánchez 17:30','Primera llamada de calificación — tiene consultoría propia','todo','high',owner_id,owner_id,now()::date::timestamptz,ARRAY['ventas']),
      ('Revisar feedback de María sobre leads','30 min para revisar calidad y volumen de leads de Instagram','todo','medium',owner_id,owner_id,now()+'3 days'::interval,ARRAY['equipo']),
      ('Auditar conversaciones de ManyChat','Revisar los últimos 50 chats y optimizar flujo de calificación','todo','medium',owner_id,owner_id,now()+'5 days'::interval,ARRAY['marketing','crm']),
      ('Enviar propuesta a Ana Torres','Propuesta personalizada basada en la llamada de ayer','todo','high',owner_id,owner_id,now()+'1 day'::interval,ARRAY['ventas']),
      ('Actualizar bio de Instagram','Nuevo CTA en el link en bio con oferta de diagnóstico gratuito','todo','medium',owner_id,owner_id,now()+'4 days'::interval,ARRAY['marketing']),
      ('Preparar agenda call de equipo viernes','KPIs, pipeline, prioridades semanales y reconocimientos','todo','medium',owner_id,owner_id,now()+'3 days'::interval,ARRAY['equipo']),
      ('Crear encuesta NPS mensual','Formulario de satisfacción para los 12 alumnos activos','todo','medium',owner_id,owner_id,now()+'7 days'::interval,ARRAY['operaciones']),
      ('Seguimiento urgente a Mateo Domínguez','⚠️ Sin contacto hace 14 días. Llamar antes de las 18hs.','todo','urgent',owner_id,owner_id,now()::date::timestamptz,ARRAY['ventas','crm']),
      ('Editar reel sobre escalamiento','Agregar subtítulos, B-roll y música al reel grabado','todo','medium',owner_id,owner_id,now()+'2 days'::interval,ARRAY['contenido']),
      ('Review mensual pipeline completo','Análisis de cada lead activo y definición de próximos pasos','todo','high',owner_id,owner_id,now()+'2 days'::interval,ARRAY['ventas','estrategia']),
      ('Diseñar carrusel 3 errores del founder','Carrusel 7 slides sobre errores al escalar el negocio','todo','low',owner_id,owner_id,now()+'6 days'::interval,ARRAY['contenido','marketing']);

    -- IN_PROGRESS (7)
    INSERT INTO tasks (title,description,status,priority,created_by,assigned_to,due_date,tags) VALUES
      ('Grabar 3 reels esta semana','Temas: escalamiento, delegación, case study alumno. ⚠️ YA ATRASADO.',  'in_progress','urgent',owner_id,owner_id,now()-'2 days'::interval,ARRAY['contenido']),
      ('Onboarding de Ana Torres','Welcome pack + acceso al portal + agendar primera sesión','in_progress','high',owner_id,owner_id,now()::date::timestamptz,ARRAY['operaciones']),
      ('Preparar argumentos para cierre con Federico','Research + propuesta final para llamada de las 16:30','in_progress','urgent',owner_id,owner_id,now()::date::timestamptz,ARRAY['ventas']),
      ('Compilar métricas de mayo para el equipo','Dashboard con KPIs, pipeline y performance individual','in_progress','high',owner_id,owner_id,now()+'1 day'::interval,ARRAY['reportes']),
      ('Crear post sobre mindset del founder','Post con estadísticas reales + CTA al link en bio','in_progress','medium',owner_id,owner_id,now()+'1 day'::interval,ARRAY['contenido','marketing']),
      ('Optimizar flujo de calificación ManyChat','Agregar preguntas de ticket mínimo y urgencia','in_progress','high',owner_id,owner_id,now()+'3 days'::interval,ARRAY['marketing','crm']),
      ('Actualizar propuesta comercial 2026','Nuevos casos de éxito + pricing actualizado + garantía','in_progress','medium',owner_id,owner_id,now()+'5 days'::interval,ARRAY['ventas']);

    -- REVIEW (4)
    INSERT INTO tasks (title,description,status,priority,created_by,assigned_to,due_date,tags) VALUES
      ('Revisar y aprobar pitch deck actualizado','Deck para prospects enterprise. Pendiente de revisión final.','review','high',owner_id,owner_id,now()-'4 days'::interval,ARRAY['ventas']),
      ('Analizar caso Camila Ruiz — reembolso','Documentar razones y crear protocolo de retención','review','high',owner_id,owner_id,now()-'1 day'::interval,ARRAY['operaciones','crm']),
      ('Revisar guión del reel de delegación','Script listo, necesita aprobación antes de grabar','review','medium',owner_id,owner_id,now()+'1 day'::interval,ARRAY['contenido']),
      ('Analizar resultados NPS de abril','67 puntos. Revisar comentarios + definir acciones concretas.','review','medium',owner_id,owner_id,now()+'2 days'::interval,ARRAY['operaciones']);

    -- DONE (4)
    INSERT INTO tasks (title,description,status,priority,created_by,assigned_to,due_date,tags,completed_at) VALUES
      ('Setup de Omni con datos del equipo','Configuración inicial del sistema operativo del negocio','done','high',owner_id,owner_id,now()-'2 days'::interval,ARRAY['tech'],now()-'2 days'::interval),
      ('Publicar carrusel 5 hábitos del founder','Publicado el lunes — 2,100 likes, 450 saves 🔥','done','medium',owner_id,owner_id,now()-'3 days'::interval,ARRAY['contenido'],now()-'3 days'::interval),
      ('Call de equipo semanal — lunes','Revisamos pipeline y asignamos prioridades de la semana','done','medium',owner_id,owner_id,now()-'5 days'::interval,ARRAY['equipo'],now()-'5 days'::interval),
      ('Enviar recap mensual a alumnos activos','Email con logros de abril, recordatorios y próximos pasos','done','high',owner_id,owner_id,now()-'7 days'::interval,ARRAY['operaciones'],now()-'7 days'::interval);

  END IF; -- tasks

  -- ─── Competitors (5) ─────────────────────────────────────────
  IF (SELECT COUNT(*) FROM competitors) < 3 THEN

    INSERT INTO competitors (name,category,instagram_handle,youtube_handle,tiktok_handle,website_url,notes,tags,added_by) VALUES
      ('El Coach Empresarial','Mentoría empresarial','elcoachempresarial','elcoachempresarial',null,'elcoachempresarial.com','↑ +2,400 seguidores este mes tras campaña sobre "salir del estancamiento". Engagement bajo (2.1%) para su audiencia (45k). Precio estimado: $2,500/mes. Punto débil: contenido muy genérico.',ARRAY['mentoring','premium','45k-ig'],owner_id),
      ('Mentoría con Fede','Mentoría business','mentoriaconfede',null,null,null,'Audiencia pequeña (28k) pero engagement muy alto (6.1%). Estrategia de contenido muy consistente. Precio estimado $1,500/mes. Mayor amenaza en el segmento entry-level.',ARRAY['mentoring','alto-engagement','28k-ig'],owner_id),
      ('Carolina Coach','Coaching de negocios','carolinacoach.ok',null,'carolinacoach','carolinacoach.ar','🚀 Crecimiento explosivo en TikTok +5,200 este mes. Tendencia clara hacia content corto. Instagram: 67k (+800). Posible amenaza si pivotea a mentoring premium.',ARRAY['coaching','tiktok','viral','67k-ig'],owner_id),
      ('Mentor Premium','Mentoría ejecutiva','mentorpremiumar','mentorpremium',null,null,'Audiencia en declive. Engagement muy bajo (1.2%). Precio muy alto ($4,000/mes) sin justificación de valor clara. No representa amenaza inmediata.',ARRAY['premium','ejecutivo','declinando'],owner_id),
      ('Coach Productividad','Productividad y negocios','coachproductividad',null,null,null,'Nicho diferente (productividad personal vs business). Estable pero no compite directamente con LM Mentoring. A monitorear.',ARRAY['productividad','estable'],owner_id);

  END IF; -- competitors

  -- ─── Content pieces (20) ─────────────────────────────────────
  IF (SELECT COUNT(*) FROM content_pieces) < 5 THEN

    INSERT INTO content_pieces (title,description,format,platform,status,scheduled_for,published_at,metrics,tags,created_by) VALUES
      ('Los 3 errores del emprendedor que no escala','Carrusel 7 slides con los errores más comunes y cómo evitarlos','carousel','instagram','published',null,now()-'2 days'::interval,'{"likes":2847,"comments":143,"saves":891,"reach":18200}'::jsonb,ARRAY['errores','escalamiento'],owner_id),
      ('Cómo pasé de $5k a $21k en 12 meses','Reel mostrando la historia real de LM Mentoring','reel','instagram','published',null,now()-'5 days'::interval,'{"likes":4521,"comments":287,"saves":1203,"reach":42000}'::jsonb,ARRAY['historia','crecimiento','viral'],owner_id),
      ('El framework de delegación','Reel de 30 segundos explicando el sistema de 3 niveles','reel','instagram','scheduled',now()+'1 day'::interval,null,'{}'::jsonb,ARRAY['delegacion','liderazgo'],owner_id),
      ('5 hábitos del founder que escala','Carrusel con rituales y sistemas de trabajo probados','carousel','instagram','published',null,now()-'8 days'::interval,'{"likes":1893,"comments":95,"saves":672,"reach":14500}'::jsonb,ARRAY['habitos','productividad'],owner_id),
      ('Mi stack de herramientas 2026','Video mostrando todas las herramientas para gestionar el negocio','video','youtube','published',null,now()-'12 days'::interval,'{"views":3240,"likes":189,"comments":67}'::jsonb,ARRAY['herramientas','tech'],owner_id),
      ('Por qué tu negocio está en meseta','Reel sobre las 3 razones más comunes del estancamiento','reel','instagram','draft',null,null,'{}'::jsonb,ARRAY['meseta','crecimiento'],owner_id),
      ('Cómo contratar tu primer empleado','Post largo con framework para primeras contrataciones','post','instagram','published',null,now()-'15 days'::interval,'{"likes":1245,"comments":78,"saves":445,"reach":9800}'::jsonb,ARRAY['equipo','contratacion'],owner_id),
      ('El embudo de ventas que me da $21k/mes','Carrusel mostrando el proceso completo paso a paso','carousel','instagram','scheduled',now()+'3 days'::interval,null,'{}'::jsonb,ARRAY['ventas','embudo'],owner_id),
      ('Mindset del emprendedor que factura $20k','Reel sobre mentalidad y creencias limitantes','reel','instagram','idea',null,null,'{}'::jsonb,ARRAY['mindset'],owner_id),
      ('Case study: de $3k a $18k en 4 meses','Historia real de transformación de alumno (con permiso)','video','youtube','draft',null,null,'{}'::jsonb,ARRAY['caso-exito','testimonial'],owner_id),
      ('La rutina semanal del founder productivo','Story series sobre cómo estructuro la semana','story','instagram','published',null,now()-'3 days'::interval,'{"views":6840,"taps_forward":2100}'::jsonb,ARRAY['rutina','productividad'],owner_id),
      ('Pricing: cómo cobrar más sin perder clientes','Carrusel sobre estrategias de pricing con ejemplos reales','carousel','instagram','scheduled',now()+'5 days'::interval,null,'{}'::jsonb,ARRAY['pricing','ventas'],owner_id),
      ('El problema del founder que hace todo','Reel viral sobre delegación y confianza en el equipo','reel','tiktok','published',null,now()-'6 days'::interval,'{"views":28400,"likes":3200,"comments":420}'::jsonb,ARRAY['delegacion','viral'],owner_id),
      ('5 señales de que tu negocio va a explotar','Carrusel con indicadores de crecimiento inminente','carousel','instagram','idea',null,null,'{}'::jsonb,ARRAY['indicadores','crecimiento'],owner_id),
      ('Cómo planifico mi mes de contenido','Tutorial sobre el sistema de planificación mensual','video','youtube','scheduled',now()+'7 days'::interval,null,'{}'::jsonb,ARRAY['contenido','planificacion'],owner_id),
      ('Q&A semanal con emprendedores','Story interactiva con preguntas de la comunidad','story','instagram','published',null,now()-'1 day'::interval,'{"views":4320,"replies":89}'::jsonb,ARRAY['qa','comunidad'],owner_id),
      ('El error #1 al escalar tu equipo','Reel sobre micromanagement y sus consecuencias','reel','instagram','review',null,null,'{}'::jsonb,ARRAY['equipo','error'],owner_id),
      ('Cómo calificar leads en 5 minutos','Tutorial sobre el proceso de calificación de ventas','reel','tiktok','draft',null,null,'{}'::jsonb,ARRAY['ventas','leads'],owner_id),
      ('El sistema que me liberó 20 horas semanales','Carrusel sobre automatización y delegación efectiva','carousel','instagram','scheduled',now()+'10 days'::interval,null,'{}'::jsonb,ARRAY['automatizacion','tiempo'],owner_id),
      ('Storytime: el mes que casi cierro el negocio','Reel honesto sobre los momentos difíciles del emprendimiento','reel','instagram','idea',null,null,'{}'::jsonb,ARRAY['honestidad','historia'],owner_id);

  END IF; -- content

  -- ─── Channels + messages ─────────────────────────────────────
  IF (SELECT COUNT(*) FROM channels) < 2 THEN

    INSERT INTO channels (name,description,is_private,created_by) VALUES
      ('general','Canal principal del equipo',false,owner_id),
      ('ventas','Equipo de ventas — Setters y Closers',false,owner_id),
      ('marketing','Contenido, redes y crecimiento',false,owner_id),
      ('urgente','Solo para temas críticos y urgentes',false,owner_id);

    -- Messages #general
    INSERT INTO messages (channel_id,user_id,content,created_at)
    SELECT id,owner_id,msg,ts FROM channels, (VALUES
      ('general','Equipo, mañana 10am call de revisión del mes. Preparen sus números 📊',now()-'5 hours'::interval),
      ('general','Subí 5 leads nuevos al CRM — todos calificados y listos para llamadas 👀',now()-'4 hours'::interval),
      ('general','Reel sobre escalamiento editado — se publica hoy a las 19hs ✨',now()-'3 hours'::interval),
      ('general','¡Cerré con Federico Acosta! 🎉 $5,400 entrada. Gracias al equipo por el follow-up.',now()-'2 hours'::interval),
      ('general','💪 Así se trabaja! Diego maestro del cierre 🏆',now()-'1 hour'::interval),
      ('general','Recordatorio: el análisis de mayo tiene que estar listo para el viernes 9am',now()-'30 minutes'::interval),
      ('ventas','Esta semana: 23 llamadas realizadas, close rate del 35% 💪',now()-'8 hours'::interval),
      ('ventas','Federico Acosta casi listo. Llamada de cierre hoy a las 16:30 🤞',now()-'6 hours'::interval),
      ('ventas','⚠️ Mateo Domínguez — 14 días sin contacto. Alguien puede hacer el follow-up hoy?',now()-'4 hours'::interval),
      ('ventas','Me comprometo a llamarlo antes de las 18hs 🙋',now()-'3 hours'::interval),
      ('ventas','Nuevos leads semana: Valentina Castro y Camila Herrera. Calidad alta, fuente Instagram.',now()-'2 hours'::interval),
      ('marketing','El reel de la semana pasada llegó a 42,000 personas 🔥 Mejor número hasta ahora',now()-'12 hours'::interval),
      ('marketing','3 ideas para reels esta semana: delegación, meseta, case study de alumno activo',now()-'10 hours'::interval),
      ('marketing','Prioridad el de la meseta — es el dolor principal de nuestra audiencia esta semana',now()-'8 hours'::interval),
      ('marketing','Delegación ya grabado ✅ Queda editar + subtítulos. Listo para mañana.',now()-'5 hours'::interval),
      ('marketing','Para el jueves necesito los 3 reels terminados. Nueva semana de contenido el lunes.',now()-'2 hours'::interval),
      ('urgente','⚠️ Camila Ruiz solicitó reembolso. La contacté pero no responde. Revisar urgente.',now()-'2 days'::interval),
      ('urgente','Churn rate subió a 8.3% (era 4.1% en enero). Analizar en la próxima call de equipo.',now()-'1 day'::interval),
      ('urgente','Link del formulario de onboarding caído desde ayer. Ya estoy arreglándolo.',now()-'3 hours'::interval)
    ) AS t(channel_name,msg,ts)
    WHERE channels.name = t.channel_name;

  END IF; -- channels

  -- ─── Discovery form ──────────────────────────────────────────
  IF (SELECT COUNT(*) FROM discovery_forms) < 1 THEN

    INSERT INTO discovery_forms (title,description,questions,is_active,created_by)
    VALUES (
      'Diagnóstico inicial — LM Mentoring',
      'Este formulario nos ayuda a entender tu situación actual para preparar tu primera sesión de mentoría.',
      '[
        {"id":"q1","type":"text","question":"¿Cuál es tu nombre completo y a qué se dedica tu negocio?","required":true},
        {"id":"q2","type":"text","question":"¿Cuánto facturás mensualmente actualmente?","required":true},
        {"id":"q3","type":"textarea","question":"¿Cuál es el principal cuello de botella que sentís hoy en tu negocio?","required":true},
        {"id":"q4","type":"choice","question":"¿Cuántas horas semanales le dedicás al negocio?","options":["Menos de 20hs","20-40hs","40-60hs","Más de 60hs"],"required":true},
        {"id":"q5","type":"textarea","question":"¿Qué intentaste antes para resolver ese cuello de botella y no funcionó?","required":false},
        {"id":"q6","type":"choice","question":"¿Cuánto lleva tu negocio operando?","options":["Menos de 1 año","1-2 años","2-5 años","Más de 5 años"],"required":true},
        {"id":"q7","type":"text","question":"¿Qué resultado concreto esperás lograr en los próximos 3 meses?","required":true},
        {"id":"q8","type":"choice","question":"¿Tenés equipo actualmente?","options":["No, trabajo solo","Sí, 1-2 personas","Sí, 3-5 personas","Sí, más de 5 personas"],"required":true},
        {"id":"q9","type":"rating","question":"Del 1 al 5, ¿qué tan urgente es para vos resolver esto?","required":true},
        {"id":"q10","type":"textarea","question":"¿Hay algo más que quieras contarnos antes de nuestra primera sesión?","required":false}
      ]'::jsonb,
      true,
      owner_id
    );

    -- 3 respuestas de ejemplo
    INSERT INTO discovery_responses (form_id,respondent_name,respondent_email,answers,completed_at)
    SELECT
      f.id,
      resp.name,
      resp.email,
      resp.answers::jsonb,
      resp.completed_at
    FROM discovery_forms f,
    (VALUES
      (
        'Ana Torres',
        'ana.t@gmail.com',
        '{"q1":"Ana Torres — Consultoría de marketing para pymes","q2":"$6,500/mes","q3":"No puedo salir de ser el cuello de botella. Todo depende de mí y no encuentro cómo delegar sin perder calidad.","q4":"40-60hs","q5":"Contraté una asistente pero no funcionó. El onboarding fue terrible y terminé haciendo el doble de trabajo.","q6":"2-5 años","q7":"Tener un equipo de 3 personas funcionando sin mi supervisión constante","q8":"Sí, 1-2 personas","q9":"5","q10":"Tengo una llamada de cierre con Lucas esta semana y estoy muy motivada."}',
        now()-'2 days'::interval
      ),
      (
        'Federico Acosta',
        'federico.a@gmail.com',
        '{"q1":"Federico Acosta — Agencia de publicidad digital","q2":"$18,000/mes","q3":"Crecemos en revenue pero los márgenes bajan. El equipo es cada vez más caro y los procesos son un caos.","q4":"Más de 60hs","q5":"Leí libros, tomé cursos online. Nada terminó de aplicarse a mi realidad específica.","q6":"2-5 años","q7":"Reducir mi carga horaria a 40hs y mejorar el margen al 35%","q8":"Sí, 3-5 personas","q9":"5","q10":"Llevo 3 meses buscando un mentor. El enfoque de Lucas me parece muy práctico."}',
        now()-'5 days'::interval
      ),
      (
        'Gustavo Pérez',
        'gustavo.p@gmail.com',
        '{"q1":"Gustavo Pérez — Software as a Service para restaurantes","q2":"$30,000/mes","q3":"Tenemos producto-market fit pero no logramos escalar ventas. Cada cierre depende de mí personalmente.","q4":"Más de 60hs","q5":"Contraté un closer pero no tuvo resultados. El problema era el proceso, no la persona.","q6":"Más de 5 años","q7":"Tener un equipo de ventas de 3 personas cerrando sin mi intervención","q8":"Sí, más de 5 personas","q9":"4","q10":"Estoy dispuesto a invertir lo que sea necesario si el sistema funciona."}',
        now()-'7 days'::interval
      )
    ) AS resp(name,email,answers,completed_at)
    WHERE f.title = 'Diagnóstico inicial — LM Mentoring';

  END IF; -- discovery

  RAISE NOTICE 'Seed completado exitosamente para owner_id: %', owner_id;

END $$;
