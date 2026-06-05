import { z } from "zod"
import type Anthropic from "@anthropic-ai/sdk"

// ── Enums (estado real de la DB tras migración 019) ──────────────────────────
export const LEAD_STAGES = ["new", "contacted", "qualified", "call_scheduled", "call_done", "proposal_sent", "won", "lost"] as const
export const TASK_STATUS = ["backlog", "todo", "in_progress", "review", "done", "cancelled"] as const
export const TASK_PRIORITY = ["low", "medium", "high", "urgent"] as const
export const CLIENT_STATUS = ["active", "paused", "churned", "completed"] as const
export const CLIENT_TIER = ["standard", "premium", "vip"] as const

export type EntityKey = "lead" | "task" | "client" | "contact" | "kpi" | "announcement"
export type Op = "create" | "update" | "delete"

// ── Schemas de creación por entidad ──────────────────────────────────────────
const leadCreate = z.object({
  full_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  origin_angle: z.string().optional(),
  stage: z.enum(LEAD_STAGES).optional(),
  amount: z.number().nonnegative().optional(),
  expected_close_date: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const taskCreate = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(TASK_STATUS).optional(),
  priority: z.enum(TASK_PRIORITY).optional(),
  due_date: z.string().optional(),
  related_lead_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
})

const clientCreate = z.object({
  full_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  instagram_handle: z.string().optional(),
  status: z.enum(CLIENT_STATUS).optional(),
  tier: z.enum(CLIENT_TIER).optional(),
  monthly_fee: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const contactCreate = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  is_primary: z.boolean().optional(),
  notes: z.string().optional(),
})

const kpiCreate = z.object({
  period_month: z.string().min(1), // YYYY-MM-DD
  category: z.string().min(1),
  metric_name: z.string().min(1),
  metric_value: z.number().optional(),
  metric_target: z.number().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
})

const announcementCreate = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  is_pinned: z.boolean().optional(),
})

// ── Config por entidad ───────────────────────────────────────────────────────
type EntityConfig = {
  table: string
  label: string
  softDelete: boolean
  primary: string
  select: string
  searchColumn: string
  create: z.ZodObject<z.ZodRawShape>
  inject?: (userId: string) => Record<string, unknown>
}

export const ENTITY_CONFIG: Record<EntityKey, EntityConfig> = {
  lead: {
    table: "leads", label: "lead", softDelete: true, primary: "full_name",
    select: "id, full_name, stage, amount, email, phone, source", searchColumn: "full_name",
    create: leadCreate,
  },
  task: {
    table: "tasks", label: "tarea", softDelete: true, primary: "title",
    select: "id, title, status, priority, due_date", searchColumn: "title",
    create: taskCreate, inject: (userId) => ({ created_by: userId }),
  },
  client: {
    table: "clients", label: "cliente", softDelete: false, primary: "full_name",
    select: "id, full_name, company, status, tier, monthly_fee", searchColumn: "full_name",
    create: clientCreate,
  },
  contact: {
    table: "contacts", label: "contacto", softDelete: false, primary: "name",
    select: "id, name, email, phone, role, client_id, is_primary", searchColumn: "name",
    create: contactCreate,
  },
  kpi: {
    table: "kpis", label: "KPI", softDelete: false, primary: "metric_name",
    select: "id, metric_name, metric_value, metric_target, unit, period_month, category", searchColumn: "metric_name",
    create: kpiCreate,
  },
  announcement: {
    table: "announcements", label: "anuncio", softDelete: false, primary: "title",
    select: "id, title, is_pinned, created_at", searchColumn: "title",
    create: announcementCreate, inject: (userId) => ({ created_by: userId }),
  },
}

// ── Proposal (acción de escritura pendiente de confirmación) ──────────────────
export type Proposal = {
  id: string
  op: Op
  entity: EntityKey
  targetId?: string
  data?: Record<string, unknown>
  summary: string
}

export const proposalSchema = z.object({
  id: z.string(),
  op: z.enum(["create", "update", "delete"]),
  entity: z.enum(["lead", "task", "client", "contact", "kpi", "announcement"]),
  targetId: z.string().uuid().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  summary: z.string(),
})

// ── Validación + resumen humano ───────────────────────────────────────────────
function summarize(op: Op, cfg: EntityConfig, data?: Record<string, unknown>, targetId?: string): string {
  if (op === "delete") return `Eliminar ${cfg.label} (${targetId})`
  const primaryVal = data?.[cfg.primary] != null ? `"${data[cfg.primary]}"` : ""
  const extras: string[] = []
  if (data?.stage) extras.push(`stage: ${data.stage}`)
  if (data?.status) extras.push(`estado: ${data.status}`)
  if (data?.priority) extras.push(`prioridad: ${data.priority}`)
  if (data?.amount != null) extras.push(`monto: $${data.amount}`)
  if (data?.monthly_fee != null) extras.push(`fee: $${data.monthly_fee}`)
  if (data?.metric_value != null) extras.push(`valor: ${data.metric_value}`)
  if (data?.due_date) extras.push(`vence: ${data.due_date}`)
  const tail = extras.length ? ` · ${extras.join(" · ")}` : ""
  return op === "create"
    ? `Crear ${cfg.label} ${primaryVal}${tail}`.trim()
    : `Editar ${cfg.label} ${primaryVal || `(${targetId})`}${tail}`.trim()
}

/** Valida los args de una tool de escritura y devuelve un Proposal (o lanza ZodError). */
export function buildProposal(op: Op, entity: EntityKey, raw: { id?: string; data?: unknown }): Proposal {
  const cfg = ENTITY_CONFIG[entity]
  if (op === "delete") {
    if (!raw.id) throw new Error("Falta el id del registro a eliminar.")
    return { id: crypto.randomUUID(), op, entity, targetId: raw.id, summary: summarize(op, cfg) + ` (${raw.id})` }
  }
  // create / update
  const schema = op === "create" ? cfg.create : cfg.create.partial()
  const data = schema.parse(raw.data ?? {}) as Record<string, unknown>
  if (op === "update") {
    if (!raw.id) throw new Error("Falta el id del registro a editar.")
    if (Object.keys(data).length === 0) throw new Error("No hay campos para actualizar.")
    return { id: crypto.randomUUID(), op, entity, targetId: raw.id, data, summary: summarize(op, cfg, data, raw.id) }
  }
  return { id: crypto.randomUUID(), op, entity, data, summary: summarize(op, cfg, data) }
}

/** Ejecuta un Proposal ya confirmado, usando el cliente RLS-scopeado (respeta permisos). */
export async function executeProposal(
  sb: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  userId: string,
  p: Proposal,
): Promise<{ ok: boolean; error?: string; row?: unknown }> {
  const cfg = ENTITY_CONFIG[p.entity]
  try {
    if (p.op === "create") {
      const payload = { ...(p.data ?? {}), ...(cfg.inject ? cfg.inject(userId) : {}) }
      const { data, error } = await sb.from(cfg.table).insert(payload).select(cfg.select).single()
      if (error) return { ok: false, error: error.message }
      return { ok: true, row: data }
    }
    if (p.op === "update") {
      const { data, error } = await sb.from(cfg.table).update(p.data ?? {}).eq("id", p.targetId).select(cfg.select).single()
      if (error) return { ok: false, error: error.message }
      return { ok: true, row: data }
    }
    // delete
    if (cfg.softDelete) {
      const { error } = await sb.from(cfg.table).update({ deleted_at: new Date().toISOString() }).eq("id", p.targetId)
      if (error) return { ok: false, error: error.message }
    } else {
      const { error } = await sb.from(cfg.table).delete().eq("id", p.targetId)
      if (error) return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" }
  }
}

// ── Definiciones de tools para Anthropic ──────────────────────────────────────
const ENTITY_FIELD_REF = `
Entidades y campos válidos:
- lead: full_name(req), email, phone, source, origin_angle, stage[${LEAD_STAGES.join("|")}], amount(número), expected_close_date(YYYY-MM-DD), notes, tags[]
- task: title(req), description, status[${TASK_STATUS.join("|")}], priority[${TASK_PRIORITY.join("|")}], due_date(ISO), related_lead_id(uuid), assigned_to(uuid), tags[]
- client: full_name(req), email, phone, company, instagram_handle, status[${CLIENT_STATUS.join("|")}], tier[${CLIENT_TIER.join("|")}], monthly_fee(número), currency, notes, tags[]
- contact: client_id(uuid, req), name(req), email, phone, role, is_primary(bool), notes
- kpi: period_month(YYYY-MM-DD, req), category(req), metric_name(req), metric_value(número), metric_target(número), unit, notes
- announcement: title(req), body, is_pinned(bool)`.trim()

const entityEnum = ["lead", "task", "client", "contact", "kpi", "announcement"]

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "find_records",
    description: `Busca registros existentes para obtener sus IDs o ver qué hay. SIEMPRE usá esto antes de editar/eliminar (nunca inventes IDs) y antes de crear, para evitar duplicados. Es solo lectura, se ejecuta al instante.`,
    input_schema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: entityEnum, description: "Tipo de registro a buscar." },
        search: { type: "string", description: "Texto a buscar en el campo principal (nombre/título/métrica). Opcional." },
        limit: { type: "number", description: "Máximo de resultados (default 10)." },
      },
      required: ["entity"],
    },
  },
  {
    name: "create_record",
    description: `Propone CREAR un registro nuevo. Requiere confirmación del usuario antes de ejecutarse. ${ENTITY_FIELD_REF}`,
    input_schema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: entityEnum },
        data: { type: "object", description: "Campos del registro según la entidad." },
      },
      required: ["entity", "data"],
    },
  },
  {
    name: "update_record",
    description: `Propone EDITAR un registro existente (por id). Requiere confirmación. Pasá solo los campos que cambian. ${ENTITY_FIELD_REF}`,
    input_schema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: entityEnum },
        id: { type: "string", description: "UUID del registro a editar (obtenelo con find_records)." },
        data: { type: "object", description: "Campos a modificar." },
      },
      required: ["entity", "id", "data"],
    },
  },
  {
    name: "delete_record",
    description: `Propone ELIMINAR un registro (por id). Requiere confirmación. leads y tareas se borran lógicamente (soft-delete); el resto se elimina definitivamente.`,
    input_schema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: entityEnum },
        id: { type: "string", description: "UUID del registro a eliminar." },
      },
      required: ["entity", "id"],
    },
  },
]

/** Ejecuta la tool de lectura find_records con el cliente RLS-scopeado. */
export async function runFindTool(
  sb: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  input: { entity?: string; search?: string; limit?: number },
): Promise<string> {
  const entity = input.entity as EntityKey
  const cfg = ENTITY_CONFIG[entity]
  if (!cfg) return JSON.stringify({ error: `Entidad desconocida: ${input.entity}` })
  let q = sb.from(cfg.table).select(cfg.select)
  if (cfg.softDelete) q = q.is("deleted_at", null)
  if (input.search && input.search.trim()) q = q.ilike(cfg.searchColumn, `%${input.search.trim()}%`)
  q = q.limit(Math.min(input.limit ?? 10, 25))
  const { data, error } = await q
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data ?? []).length, rows: data ?? [] })
}
