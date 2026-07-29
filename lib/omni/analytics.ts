// Funciones puras de agregación — sin import de Supabase, seguras para
// "use client". El dashboard de Resumen y las herramientas de análisis del
// chat/motor de automatizaciones (server-side, ver data-queries.ts) comparten
// esta misma lógica en vez de tener cada uno su propia copia.

import { formatDayMonth } from "@/lib/utils"

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr)
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

function formatWeekLabel(weekStart: string): string {
  return formatDayMonth(new Date(weekStart))
}

export type LeadWeekInput = { created_at: string; rating?: number | null; purchased?: boolean }
export type LeadWeekPoint = { week: string; weekStart: string; leads: number; closed: number; avgRating: number | null }

export function groupLeadsByWeek(leads: LeadWeekInput[]): LeadWeekPoint[] {
  const buckets = new Map<string, { count: number; closed: number; ratingSum: number; ratingCount: number }>()
  for (const lead of leads) {
    const key = mondayOf(lead.created_at)
    const bucket = buckets.get(key) ?? { count: 0, closed: 0, ratingSum: 0, ratingCount: 0 }
    bucket.count += 1
    if (lead.purchased) bucket.closed += 1
    if (lead.rating != null) {
      bucket.ratingSum += lead.rating
      bucket.ratingCount += 1
    }
    buckets.set(key, bucket)
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, b]) => ({
      week: formatWeekLabel(weekStart),
      weekStart,
      leads: b.count,
      closed: b.closed,
      avgRating: b.ratingCount > 0 ? Number((b.ratingSum / b.ratingCount).toFixed(2)) : null,
    }))
}

export type ContentCalendarWeekInput = { scheduled_date: string; status: string }
export type ContentCalendarWeekPoint = { week: string; weekStart: string; planned: number; recorded: number; published: number }

export function groupContentCalendarByWeek(rows: ContentCalendarWeekInput[]): ContentCalendarWeekPoint[] {
  const buckets = new Map<string, { planned: number; recorded: number; published: number }>()
  for (const row of rows) {
    const key = mondayOf(row.scheduled_date)
    const bucket = buckets.get(key) ?? { planned: 0, recorded: 0, published: 0 }
    if (row.status === "planned") bucket.planned += 1
    else if (row.status === "recorded") bucket.recorded += 1
    else if (row.status === "published") bucket.published += 1
    buckets.set(key, bucket)
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, b]) => ({ week: formatWeekLabel(weekStart), weekStart, ...b }))
}
