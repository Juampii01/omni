"use client"

import { useState, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ChevronLeft, ChevronRight, CalendarDays,
  CheckSquare, Users, Clock, AlertCircle, X,
} from "lucide-react"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

type Task = {
  id: string
  title: string
  priority: "low" | "medium" | "high" | "urgent"
  due_date: string
  status: string
}

type Lead = {
  id: string
  full_name: string
  stage: string
  expected_close_date: string
  amount: number
}

type CalEvent = {
  id: string
  title: string
  dateStr: string   // "YYYY-MM-DD"
  type: "task_urgent" | "task_high" | "task_medium" | "task_low" | "meeting" | "proposal" | "negotiation"
  href: string
  amount?: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const EVENT_CONFIG: Record<CalEvent["type"], { bg: string; text: string; border: string; label: string }> = {
  task_urgent:  { bg: "bg-red-100",    text: "text-red-700",    border: "border-red-300",    label: "Urgente" },
  task_high:    { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", label: "Alta" },
  task_medium:  { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-300",   label: "Media" },
  task_low:     { bg: "bg-slate-100",  text: "text-slate-600",  border: "border-slate-300",  label: "Baja" },
  meeting:      { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-300", label: "Reunión" },
  proposal:     { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-300",  label: "Propuesta" },
  negotiation:  { bg: "bg-emerald-100",text: "text-emerald-700",border: "border-emerald-300",label: "Cierre" },
}

const STAGE_TO_TYPE: Record<string, CalEvent["type"]> = {
  meeting_scheduled: "meeting",
  meeting_done:      "meeting",
  proposal_sent:     "proposal",
  negotiation:       "negotiation",
  qualified:         "proposal",
  new:               "task_low",
}

const PRIORITY_TO_TYPE: Record<string, CalEvent["type"]> = {
  urgent: "task_urgent",
  high:   "task_high",
  medium: "task_medium",
  low:    "task_low",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  // Convert Sunday=0 to Monday=0
  let startDow = firstDay.getDay()
  startDow = startDow === 0 ? 6 : startDow - 1

  const days: Date[] = []

  // Pad from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  // Fill to 42 cells (6 rows)
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push(new Date(year, month + 1, d))
  }

  return days
}

function formatDateFull(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
}

// ── Event pill ────────────────────────────────────────────────────────────────

function EventPill({ event, compact = false }: { event: CalEvent; compact?: boolean }) {
  const cfg = EVENT_CONFIG[event.type]
  return (
    <Link
      href={event.href}
      className={cn(
        "block rounded px-1.5 truncate transition-opacity hover:opacity-80",
        cfg.bg, cfg.text,
        compact ? "text-[10px] py-0.5 leading-tight" : "text-xs py-1"
      )}
      title={event.title}
      onClick={e => e.stopPropagation()}
    >
      <span className="truncate font-medium">{event.title}</span>
    </Link>
  )
}

// ── Day cell ──────────────────────────────────────────────────────────────────

function DayCell({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  events,
  onClick,
}: {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  events: CalEvent[]
  onClick: () => void
}) {
  const MAX_VISIBLE = 3
  const visible  = events.slice(0, MAX_VISIBLE)
  const overflow = events.length - MAX_VISIBLE
  const hasEvents = events.length > 0

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative min-h-[100px] p-1.5 rounded-xl cursor-pointer select-none transition-all",
        !isCurrentMonth && "opacity-30",
        isSelected
          ? "bg-brand/8 ring-1 ring-brand/40"
          : "hover:bg-muted/60",
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          "w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
          isToday
            ? "bg-brand text-white"
            : isSelected
            ? "bg-brand/20 text-brand"
            : "text-foreground group-hover:bg-muted"
        )}>
          {date.getDate()}
        </span>
        {hasEvents && (
          <span className="text-[9px] text-muted-foreground tabular-nums opacity-60">
            {events.length}
          </span>
        )}
      </div>

      {/* Events */}
      <div className="space-y-0.5">
        {visible.map(ev => (
          <EventPill key={ev.id} event={ev} compact />
        ))}
        {overflow > 0 && (
          <p className="text-[10px] text-muted-foreground pl-1 font-medium">+{overflow} más</p>
        )}
      </div>
    </div>
  )
}

// ── Day detail panel ──────────────────────────────────────────────────────────

function DayPanel({
  dateStr,
  events,
  onClose,
}: {
  dateStr: string
  events: CalEvent[]
  onClose: () => void
}) {
  const today = toDateStr(new Date())
  const isToday = dateStr === today

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {isToday ? "Hoy" : "Seleccionado"}
          </p>
          <p className="text-base font-semibold capitalize mt-0.5">
            {formatDateFull(dateStr)}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mt-0.5" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-2 py-8">
          <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Sin eventos este día</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto">
          {events.map(ev => {
            const cfg = EVENT_CONFIG[ev.type]
            const isTask = ev.type.startsWith("task")
            return (
              <Link
                key={ev.id}
                href={ev.href}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm",
                  cfg.bg, cfg.border
                )}
              >
                <div className={cn(
                  "mt-0.5 p-1.5 rounded-lg bg-white/60",
                )}>
                  {isTask
                    ? <CheckSquare className={cn("h-3.5 w-3.5", cfg.text)} />
                    : <Users className={cn("h-3.5 w-3.5", cfg.text)} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-semibold truncate", cfg.text)}>{ev.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", cfg.border, cfg.text, "bg-transparent")}>
                      {cfg.label}
                    </Badge>
                    {ev.amount != null && ev.amount > 0 && (
                      <span className={cn("text-[10px] font-medium", cfg.text)}>
                        ${ev.amount.toLocaleString("en-US")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CalendarClient({ tasks, leads }: { tasks: Task[]; leads: Lead[] }) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateStr(now))

  // Build events map (dateStr → CalEvent[])
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}

    function push(dateStr: string, ev: CalEvent) {
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(ev)
    }

    for (const task of tasks) {
      if (!task.due_date) continue
      const dateStr = task.due_date.slice(0, 10)
      push(dateStr, {
        id:    `task-${task.id}`,
        title: task.title,
        dateStr,
        type:  PRIORITY_TO_TYPE[task.priority] ?? "task_medium",
        href:  "/tasks",
      })
    }

    for (const lead of leads) {
      if (!lead.expected_close_date) continue
      const dateStr = lead.expected_close_date.slice(0, 10)
      push(dateStr, {
        id:     `lead-${lead.id}`,
        title:  lead.full_name,
        dateStr,
        type:   STAGE_TO_TYPE[lead.stage] ?? "proposal",
        href:   `/crm/${lead.id}`,
        amount: lead.amount,
      })
    }

    // Sort each day's events: tasks first (urgent→low), then leads
    Object.values(map).forEach(evs => {
      const order: CalEvent["type"][] = ["task_urgent","task_high","task_medium","task_low","meeting","negotiation","proposal"]
      evs.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
    })

    return map
  }, [tasks, leads])

  // Today
  const todayStr = toDateStr(now)

  // Calendar days
  const days = useMemo(() => getCalendarDays(year, month), [year, month])

  // Navigation
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function goToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    setSelectedDate(todayStr)
  }

  // Summary for current month
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`
  const monthEvents = Object.entries(eventsByDate)
    .filter(([d]) => d.startsWith(monthStr))
    .flatMap(([, evs]) => evs)

  const urgentCount  = monthEvents.filter(e => e.type === "task_urgent").length
  const meetingCount = monthEvents.filter(e => e.type === "meeting").length
  const closeCount   = monthEvents.filter(e => e.type === "negotiation" || e.type === "proposal").length

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []
  const hasPanel = selectedDate !== null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendario"
        description="Reuniones, cierres y vencimientos de tareas"
      />

      {/* ── Month nav + summary ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[10rem] text-center">
            <span className="font-semibold text-sm capitalize">
              {MONTH_NAMES[month]} {year}
            </span>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-1 h-8 text-xs" onClick={goToday}>
            Hoy
          </Button>
        </div>

        {/* Month summary chips */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {urgentCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
              <AlertCircle className="h-3 w-3" />
              {urgentCount} urgente{urgentCount !== 1 ? "s" : ""}
            </span>
          )}
          {meetingCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-200">
              <Users className="h-3 w-3" />
              {meetingCount} reunión{meetingCount !== 1 ? "es" : ""}
            </span>
          )}
          {closeCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Clock className="h-3 w-3" />
              {closeCount} cierre{closeCount !== 1 ? "s" : ""}
            </span>
          )}
          {monthEvents.length === 0 && (
            <span className="text-xs text-muted-foreground">Sin eventos este mes</span>
          )}
        </div>
      </div>

      {/* ── Calendar + panel ────────────────────────────────────── */}
      <div className={cn(
        "flex gap-4",
        hasPanel ? "lg:flex-row flex-col" : ""
      )}>
        {/* Calendar grid */}
        <div className={cn(
          "flex-1 min-w-0 border border-border rounded-2xl overflow-hidden bg-background shadow-sm",
        )}>
          {/* Week header */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {WEEK_DAYS.map(day => (
              <div key={day} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-px bg-border p-px">
            {days.map((date, i) => {
              const dateStr = toDateStr(date)
              const isCurrentMonth = date.getMonth() === month
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const events = eventsByDate[dateStr] ?? []

              return (
                <div key={i} className="bg-background">
                  <DayCell
                    date={date}
                    isCurrentMonth={isCurrentMonth}
                    isToday={isToday}
                    isSelected={isSelected}
                    events={events}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Day detail panel */}
        {hasPanel && (
          <div className={cn(
            "border border-border rounded-2xl bg-background shadow-sm p-4",
            "lg:w-72 lg:shrink-0 lg:self-start lg:sticky lg:top-4"
          )}>
            <DayPanel
              dateStr={selectedDate!}
              events={selectedEvents}
              onClose={() => setSelectedDate(null)}
            />
          </div>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 pt-1">
        <p className="text-xs text-muted-foreground font-medium self-center">Referencias:</p>
        {(Object.entries(EVENT_CONFIG) as [CalEvent["type"], typeof EVENT_CONFIG[CalEvent["type"]]][])
          .map(([type, cfg]) => (
            <span key={type} className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full",
              cfg.bg, cfg.text
            )}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {cfg.label}
            </span>
          ))
        }
      </div>
    </div>
  )
}
