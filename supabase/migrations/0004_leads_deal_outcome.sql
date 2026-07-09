-- ============================================================================
-- 0004 — Términos de cierre en `leads`
-- ============================================================================
-- El piloto original (Smart-Scale/Ann) cruzaba `leads` con una tabla CRM
-- separada (`crm_clients` + `crm_installments`) porque ahí "cliente" ya
-- significaba "cliente pagante del negocio de Ann". Acá `clients` significa
-- otra cosa (el tenant que usa Omni) — así que el resultado del cierre de
-- CADA lead vive directo en la fila del lead, sin tabla CRM paralela.
alter table public.leads
  add column if not exists lead_type text,
  add column if not exists tag text,
  add column if not exists purchased boolean not null default false,
  add column if not exists deal_type text check (deal_type in ('pago_unico', 'cuotas', 'suscripcion')),
  add column if not exists deal_amount numeric,
  add column if not exists deal_installments integer,
  add column if not exists deal_installments_paid integer,
  add column if not exists deal_duration_months integer,
  add column if not exists closed_at timestamptz;

create index if not exists idx_leads_client_purchased on public.leads(client_id, purchased);

notify pgrst, 'reload schema';
