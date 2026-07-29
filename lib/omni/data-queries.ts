// Consultas de agregación server-only, scopeadas por client_id — usadas por
// el chat con herramientas (lib/omni/chat-tools.ts) y por la acción
// ai_digest del motor de automatizaciones (lib/omni/automation-actions.ts).
// Nunca importar este archivo desde un componente "use client" — usa
// createServiceClient (service_role, bypassea RLS).
import { createServiceClient } from "@/lib/supabase-service"
import { groupLeadsByWeek, groupContentCalendarByWeek } from "@/lib/omni/analytics"
import { isOwnClient, findForeignRow } from "@/lib/omni/isolation"

const ROW_LIMIT = 500

function assertOwnClient(rows: Array<{ client_id: string }>, clientId: string, table: string) {
  if (isOwnClient(rows, clientId)) return
  const bad = findForeignRow(rows, clientId)
  throw new Error(`Aislamiento violado en ${table}: se esperaba client_id=${clientId} pero se encontró client_id=${bad?.client_id}`)
}

function sinceIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export async function getLeadsSummary(clientId: string, opts: { sinceDays?: number } = {}) {
  const sinceDays = opts.sinceDays ?? 90
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("leads")
    .select("id, client_id, source, niche, lead_type, status, rating, purchased, deal_amount, created_at, closed_at")
    .eq("client_id", clientId)
    .gte("created_at", sinceIso(sinceDays))
    .order("created_at", { ascending: true })
    .limit(ROW_LIMIT)

  if (error) throw new Error(`Error leyendo leads: ${error.message}`)
  const leads = data ?? []
  assertOwnClient(leads, clientId, "leads")

  const closed = leads.filter((l) => l.purchased)
  const bySource: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  for (const l of leads) {
    if (l.source) bySource[l.source] = (bySource[l.source] ?? 0) + 1
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1
  }
  const rated = leads.filter((l) => l.rating != null)

  return {
    sinceDays,
    totalLeads: leads.length,
    closedLeads: closed.length,
    conversionRatePct: leads.length > 0 ? Number(((closed.length / leads.length) * 100).toFixed(1)) : 0,
    avgRating: rated.length > 0 ? Number((rated.reduce((s, l) => s + (l.rating ?? 0), 0) / rated.length).toFixed(2)) : null,
    totalDealAmount: closed.reduce((s, l) => s + (l.deal_amount ?? 0), 0),
    bySource,
    byStatus,
    byWeek: groupLeadsByWeek(leads),
  }
}

export async function getContentCalendarSummary(clientId: string, opts: { sinceDays?: number } = {}) {
  const sinceDays = opts.sinceDays ?? 90
  const supabase = createServiceClient()
  const since = sinceIso(sinceDays).slice(0, 10)
  const { data, error } = await supabase
    .from("content_calendar")
    .select("id, client_id, idea_id, scheduled_date, status")
    .eq("client_id", clientId)
    .gte("scheduled_date", since)
    .order("scheduled_date", { ascending: true })
    .limit(ROW_LIMIT)

  if (error) throw new Error(`Error leyendo content_calendar: ${error.message}`)
  const rows = data ?? []
  assertOwnClient(rows, clientId, "content_calendar")

  const ideaIds = [...new Set(rows.map((r) => r.idea_id).filter((id): id is string => !!id))]
  const byChannel: Record<string, number> = {}
  if (ideaIds.length > 0) {
    const { data: ideas } = await supabase.from("content_ideas").select("id, client_id, channel").eq("client_id", clientId).in("id", ideaIds)
    const channelByIdea = new Map((ideas ?? []).map((i) => [i.id, i.channel]))
    for (const r of rows) {
      const channel = r.idea_id ? channelByIdea.get(r.idea_id) : null
      if (channel) byChannel[channel] = (byChannel[channel] ?? 0) + 1
    }
  }

  const byStatus: Record<string, number> = {}
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1

  return {
    sinceDays,
    totalScheduled: rows.length,
    byStatus,
    byChannel,
    byWeek: groupContentCalendarByWeek(rows),
  }
}

export async function getKanbanTasksSummary(clientId: string, opts: { columnId?: string } = {}) {
  const supabase = createServiceClient()
  let query = supabase
    .from("kanban_tasks")
    .select("id, client_id, title, column_id, priority, blocked, due_date, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT)
  if (opts.columnId) query = query.eq("column_id", opts.columnId)

  const { data, error } = await query
  if (error) throw new Error(`Error leyendo kanban_tasks: ${error.message}`)
  const tasks = data ?? []
  assertOwnClient(tasks, clientId, "kanban_tasks")

  const today = new Date().toISOString().slice(0, 10)
  const byColumn: Record<string, number> = {}
  const byPriority: Record<string, number> = {}
  let overdue = 0
  for (const t of tasks) {
    byColumn[t.column_id] = (byColumn[t.column_id] ?? 0) + 1
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1
    if (t.due_date && t.due_date < today && t.column_id !== "listo") overdue += 1
  }

  return {
    totalTasks: tasks.length,
    blockedCount: tasks.filter((t) => t.blocked).length,
    overdueCount: overdue,
    byColumn,
    byPriority,
  }
}

export async function getCalendarEventsSummary(clientId: string, opts: { pastDays?: number; upcomingDays?: number } = {}) {
  const pastDays = opts.pastDays ?? 30
  const upcomingDays = opts.upcomingDays ?? 30
  const supabase = createServiceClient()
  const from = sinceIso(pastDays).slice(0, 10)
  const to = new Date(Date.now() + upcomingDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from("calendar_events")
    .select("id, client_id, title, event_date, event_type")
    .eq("client_id", clientId)
    .gte("event_date", from)
    .lte("event_date", to)
    .order("event_date", { ascending: true })
    .limit(ROW_LIMIT)

  if (error) throw new Error(`Error leyendo calendar_events: ${error.message}`)
  const events = data ?? []
  assertOwnClient(events, clientId, "calendar_events")

  const today = new Date().toISOString().slice(0, 10)
  const byType: Record<string, number> = {}
  for (const e of events) byType[e.event_type] = (byType[e.event_type] ?? 0) + 1

  return {
    totalEvents: events.length,
    byType,
    upcoming: events.filter((e) => e.event_date >= today).slice(0, 10).map((e) => ({ title: e.title, date: e.event_date, type: e.event_type })),
  }
}

export async function getDailyBriefingsSummary(clientId: string, opts: { sinceDays?: number; briefingType?: string } = {}) {
  const sinceDays = opts.sinceDays ?? 30
  const supabase = createServiceClient()
  let query = supabase
    .from("daily_briefings")
    .select("id, client_id, date, type, findings, messages_analyzed")
    .eq("client_id", clientId)
    .gte("date", sinceIso(sinceDays).slice(0, 10))
    .order("date", { ascending: false })
    .limit(ROW_LIMIT)
  if (opts.briefingType) query = query.eq("type", opts.briefingType)

  const { data, error } = await query
  if (error) throw new Error(`Error leyendo daily_briefings: ${error.message}`)
  const briefings = data ?? []
  assertOwnClient(briefings, clientId, "daily_briefings")

  const byType: Record<string, number> = {}
  let totalFindings = 0
  const bySeveridad: Record<string, number> = {}
  for (const b of briefings) {
    byType[b.type] = (byType[b.type] ?? 0) + 1
    const findings = Array.isArray(b.findings) ? (b.findings as Array<{ severidad?: string }>) : []
    totalFindings += findings.length
    for (const f of findings) {
      if (f.severidad) bySeveridad[f.severidad] = (bySeveridad[f.severidad] ?? 0) + 1
    }
  }

  return { sinceDays, totalBriefings: briefings.length, byType, totalFindings, bySeveridad }
}

export async function getPulseCheckinsSummary(clientId: string, opts: { sinceDays?: number } = {}) {
  const sinceDays = opts.sinceDays ?? 30
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("pulse_checkins")
    .select("id, client_id, period_label, wins, struggles, mood, created_at")
    .eq("client_id", clientId)
    .gte("created_at", sinceIso(sinceDays))
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT)

  if (error) throw new Error(`Error leyendo pulse_checkins: ${error.message}`)
  const checkins = data ?? []
  assertOwnClient(checkins, clientId, "pulse_checkins")

  const byMood: Record<string, number> = {}
  for (const c of checkins) if (c.mood) byMood[c.mood] = (byMood[c.mood] ?? 0) + 1

  return {
    sinceDays,
    totalCheckins: checkins.length,
    byMood,
    recent: checkins.slice(0, 10).map((c) => ({
      period: c.period_label ?? c.created_at.slice(0, 10),
      mood: c.mood,
      wins: c.wins,
      struggles: c.struggles,
    })),
  }
}

/** Registro por nombre — punto de extensión que reusa la acción ai_digest
 * del motor de automatizaciones (Fase D) para apuntar a distintas fuentes
 * de datos sin hardcodear una tabla en el engine. */
export const DATA_SOURCES = {
  leads: getLeadsSummary,
  content_calendar: getContentCalendarSummary,
  kanban_tasks: getKanbanTasksSummary,
  calendar_events: getCalendarEventsSummary,
  daily_briefings: getDailyBriefingsSummary,
  pulse_checkins: getPulseCheckinsSummary,
} as const

export type DataSourceKey = keyof typeof DATA_SOURCES
