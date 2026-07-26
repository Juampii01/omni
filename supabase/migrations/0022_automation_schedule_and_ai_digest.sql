-- ============================================================================
-- 0022 — Motor de automatizaciones: trigger de horario + acción de resumen IA
-- ============================================================================
-- Extiende el motor ya construido en 0017 con un cuarto trigger_type
-- ('schedule.due') y un cuarto action_type ('ai_digest') — habilita
-- "Asistentes" propios tipo Monday Wins: dispara por horario en vez de por
-- evento, y la acción resume datos con IA antes de notificar.
--
-- El valor tiene que ser 'schedule.due', no 'schedule': processAutomationEvent
-- matchea workflows por trigger_type === event_type, y para los otros 3
-- triggers ese string es idéntico en ambos lados (ver lib/omni/automation-
-- events.ts / automation-engine.ts). Usar otro valor rompe el matching en
-- silencio.
alter table public.automation_workflows
  drop constraint automation_workflows_trigger_type_check,
  add constraint automation_workflows_trigger_type_check
    check (trigger_type in ('briefing.finding', 'task.column_changed', 'webhook.incoming', 'schedule.due'));

-- Evita que el mismo horario dispare más de una vez dentro de la misma
-- ventana — lib/omni/automation-schedule.ts lo consulta y actualiza.
alter table public.automation_workflows
  add column last_triggered_at timestamptz;

alter table public.automation_steps
  drop constraint automation_steps_action_type_check,
  add constraint automation_steps_action_type_check
    check (action_type in ('create_task', 'send_notification', 'call_webhook', 'ai_digest'));

notify pgrst, 'reload schema';
