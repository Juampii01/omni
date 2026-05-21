"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  ChevronLeft, ChevronRight, CheckSquare, Users,
  Clock, AlertCircle, X, CalendarDays, Link2,
  Loader2, CheckCircle2, Unlink, ExternalLink,
  Video, MapPin, Globe,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

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

type InternalEvent = {
  id: string
  title: string
  dateStr: string
  type: "task_urgent" | "task_high" | "task_medium" | "task_low" | "meeting" | "proposal" | "negotiation"
  href: string
  amount?: number
}

type CalendlyEvent = {
  uri: string
  name: string
  status: string
  start_time: string
  end_time: string
  location?: { type: string; location?: string; join_url?: string }
  invitees: Array<{ name: string; email: string; status: string }>
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

const WEEK_DAYS   = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

const INTERNAL_EVENT_CONFIG = {
  task_urgent:  { bg: "bg-red-100",     text: "text-red-700",     label: "Urgente",    border: "border-red-300" },
  task_high:    { bg: "bg-orange-100",  text: "text-orange-700",  label: "Alta",       border: "border-orange-300" },
  task_medium:  { bg: "bg-blue-100",    text: "text-blue-700",    label: "Media",      border: "border-blue-300" },
  task_low:     { bg: "bg-slate-100",   text: "text-slate-600",   label: "Baja",       border: "border-slate-300" },
  meeting:      { bg: "bg-violet-100",  text: "text-violet-700",  label: "Reunión",    border: "border-violet-300" },
  proposal:     { bg: "bg-amber-100",   text: "text-amber-700",   label: "Propuesta",  border: "border-amber-300" },
  negotiation:  { bg: "bg-emerald-100", text: "text-emerald-700", label: "Cierre",     border: "border-emerald-300" },
}

const STAGE_TO_TYPE: Record<string, InternalEvent["type"]> = {
  meeting_scheduled: "meeting", meeting_done: "meeting",
  proposal_sent: "proposal", negotiation: "negotiation",
  qualified: "proposal", new: "task_low",
}

const PRIORITY_TO_TYPE: Record<string, InternalEvent["type"]> = {
  urgent: "task_urgent", high: "task_high", medium: "task_medium", low: "task_low",
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  let startDow = firstDay.getDay()
  startDow = startDow === 0 ? 6 : startDow - 1
  const days: Date[] = []
  for (let i = startDow - 1; i >= 0; i--) days.push(new Date(year, month, -i))
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) days.push(new Date(year, month + 1, d))
  return days
}

function formatTimeFull(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" })
}

function formatDuration(start: string, end: string): string {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

// ── Shared: calendar grid ─────────────────────────────────────────────────────

function CalendarGrid<T>({
  year, month, todayStr, selectedDate, getEvents,
  renderPill, onSelectDate,
}: {
  year: number; month: number; todayStr: string; selectedDate: string | null
  getEvents: (dateStr: string) => T[]
  renderPill: (ev: T, i: number) => React.ReactNode
  onSelectDate: (dateStr: string) => void
}) {
  const days = useMemo(() => getCalendarDays(year, month), [year, month])

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-background shadow-sm flex-1 min-w-0">
      {/* Week header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEK_DAYS.map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">{d}</div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 gap-px bg-border p-px">
        {days.map((date, i) => {
          const dateStr = toDateStr(date)
          const isCurrentMonth = date.getMonth() === month
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const events = getEvents(dateStr)
          const MAX = 3
          const visible = events.slice(0, MAX)
          const overflow = events.length - MAX

          return (
            <div key={i} className="bg-background">
              <div
                onClick={() => onSelectDate(dateStr)}
                className={cn(
                  "group min-h-[96px] p-1.5 rounded-xl cursor-pointer select-none transition-all",
                  !isCurrentMonth && "opacity-30",
                  isSelected ? "bg-brand/8 ring-1 ring-brand/40" : "hover:bg-muted/50",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                    isToday ? "bg-brand text-white" : isSelected ? "bg-brand/20 text-brand" : "text-foreground group-hover:bg-muted"
                  )}>
                    {date.getDate()}
                  </span>
                  {events.length > 0 && (
                    <span className="text-[9px] text-muted-foreground opacity-60 tabular-nums">{events.length}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {visible.map((ev, ei) => renderPill(ev, ei))}
                  {overflow > 0 && (
                    <p className="text-[10px] text-muted-foreground pl-1 font-medium">+{overflow} más</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Internal calendar ─────────────────────────────────────────────────────────

function InternalCalendar({ tasks, leads, year, month, todayStr }: {
  tasks: Task[]; leads: Lead[]; year: number; month: number; todayStr: string
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr)

  const eventsByDate = useMemo(() => {
    const map: Record<string, InternalEvent[]> = {}
    function push(dateStr: string, ev: InternalEvent) {
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(ev)
    }
    for (const t of tasks) {
      if (!t.due_date) continue
      push(t.due_date.slice(0, 10), {
        id: `task-${t.id}`, title: t.title, dateStr: t.due_date.slice(0, 10),
        type: PRIORITY_TO_TYPE[t.priority] ?? "task_medium", href: "/tasks",
      })
    }
    for (const l of leads) {
      if (!l.expected_close_date) continue
      push(l.expected_close_date.slice(0, 10), {
        id: `lead-${l.id}`, title: l.full_name, dateStr: l.expected_close_date.slice(0, 10),
        type: STAGE_TO_TYPE[l.stage] ?? "proposal", href: `/crm/${l.id}`, amount: l.amount,
      })
    }
    Object.values(map).forEach(evs => {
      const order: InternalEvent["type"][] = ["task_urgent","task_high","task_medium","task_low","meeting","negotiation","proposal"]
      evs.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
    })
    return map
  }, [tasks, leads])

  const monthStr = `${year}-${String(month+1).padStart(2,"0")}`
  const monthEvents = Object.entries(eventsByDate)
    .filter(([d]) => d.startsWith(monthStr)).flatMap(([,evs]) => evs)

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []

  return (
    <div className="space-y-4">
      {/* Month summary */}
      <div className="flex flex-wrap gap-2">
        {monthEvents.filter(e => e.type === "task_urgent").length > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
            <AlertCircle className="h-3 w-3" />
            {monthEvents.filter(e => e.type === "task_urgent").length} urgentes
          </span>
        )}
        {monthEvents.filter(e => e.type === "meeting").length > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-200">
            <Users className="h-3 w-3" />
            {monthEvents.filter(e => e.type === "meeting").length} reuniones
          </span>
        )}
        {monthEvents.filter(e => ["negotiation","proposal"].includes(e.type)).length > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <Clock className="h-3 w-3" />
            {monthEvents.filter(e => ["negotiation","proposal"].includes(e.type)).length} cierres
          </span>
        )}
        {monthEvents.length === 0 && (
          <span className="text-xs text-muted-foreground">Sin eventos este mes</span>
        )}
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        <CalendarGrid
          year={year} month={month} todayStr={todayStr} selectedDate={selectedDate}
          getEvents={(d) => eventsByDate[d] ?? []}
          renderPill={(ev, i) => {
            const cfg = INTERNAL_EVENT_CONFIG[ev.type]
            return (
              <Link key={i} href={ev.href} onClick={e => e.stopPropagation()}
                className={cn("block rounded px-1.5 text-[10px] py-0.5 leading-tight truncate font-medium transition-opacity hover:opacity-75", cfg.bg, cfg.text)}>
                {ev.title}
              </Link>
            )
          }}
          onSelectDate={(d) => setSelectedDate(d === selectedDate ? null : d)}
        />

        {selectedDate && (
          <div className="lg:w-72 lg:shrink-0 border border-border rounded-2xl bg-background shadow-sm p-4 lg:self-start lg:sticky lg:top-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {selectedDate === todayStr ? "Hoy" : "Seleccionado"}
                </p>
                <p className="text-sm font-semibold capitalize mt-0.5">{formatTimeFull(selectedDate)}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 -mt-0.5" onClick={() => setSelectedDate(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Sin eventos este día</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(ev => {
                  const cfg = INTERNAL_EVENT_CONFIG[ev.type]
                  return (
                    <Link key={ev.id} href={ev.href}
                      className={cn("flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm", cfg.bg, cfg.border)}>
                      <div className="mt-0.5 p-1.5 rounded-lg bg-white/60">
                        {ev.type.startsWith("task")
                          ? <CheckSquare className={cn("h-3.5 w-3.5", cfg.text)} />
                          : <Users className={cn("h-3.5 w-3.5", cfg.text)} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-semibold truncate", cfg.text)}>{ev.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border bg-transparent", cfg.border, cfg.text)}>{cfg.label}</Badge>
                          {ev.amount != null && ev.amount > 0 && (
                            <span className={cn("text-[10px] font-medium", cfg.text)}>${ev.amount.toLocaleString("en-US")}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pt-1">
        <p className="text-xs text-muted-foreground font-medium self-center">Referencias:</p>
        {(Object.entries(INTERNAL_EVENT_CONFIG) as [InternalEvent["type"], typeof INTERNAL_EVENT_CONFIG[InternalEvent["type"]]][]).map(([, cfg]) => (
          <span key={cfg.label} className={cn("flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full", cfg.bg, cfg.text)}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />{cfg.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Calendly setup screen ─────────────────────────────────────────────────────

function CalendlySetup({ onConnected }: { onConnected: (info: { name: string; email: string }) => void }) {
  const [apiKey, setApiKey] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    if (!apiKey.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/calendly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Error al conectar"); return }
      toast.success(`Conectado como ${data.name}`)
      onConnected({ name: data.name, email: data.email })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-16">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#006BFF]/10 flex items-center justify-center mx-auto">
            <Link2 className="h-8 w-8 text-[#006BFF]" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Conectá tu Calendly</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sincronizá todas tus reuniones agendadas directamente en el calendario de Omni.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-muted/50 rounded-2xl p-5 space-y-3 border border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cómo obtener tu API key</p>
          {[
            { n: 1, text: "Andá a calendly.com e iniciá sesión" },
            { n: 2, text: "Clickeá en tu avatar → Integraciones" },
            { n: 3, text: "Buscá "API & Webhooks"" },
            { n: 4, text: "Generá o copiá tu Personal Access Token" },
          ].map(s => (
            <div key={s.n} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-[#006BFF]/15 text-[#006BFF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {s.n}
              </span>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiJ9..."
              type="password"
              className="flex-1 font-mono text-xs"
              onKeyDown={e => e.key === "Enter" && handleConnect()}
            />
            <Button onClick={handleConnect} disabled={!apiKey.trim() || loading} className="bg-[#006BFF] hover:bg-[#0055CC] text-white shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Tu API key se guarda de forma segura y solo se usa para leer tus eventos.
          </p>
        </div>

        {/* CTA to Calendly */}
        <a href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs text-[#006BFF] hover:underline">
          <ExternalLink className="h-3 w-3" />
          Ir a Calendly → Integraciones
        </a>
      </div>
    </div>
  )
}

// ── Calendly calendar view ────────────────────────────────────────────────────

function CalendlyCalendar({ connectedInfo, onDisconnect, year, month, todayStr }: {
  connectedInfo: { name: string; email: string }
  onDisconnect: () => void
  year: number; month: number; todayStr: string
}) {
  const [events, setEvents] = useState<CalendlyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      try {
        const res = await fetch("/api/calendly")
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? "Error"); return }
        setEvents(data.events ?? [])
      } catch { setError("No se pudieron cargar los eventos") }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Group Calendly events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendlyEvent[]> = {}
    for (const ev of events) {
      const d = ev.start_time.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(ev)
    }
    return map
  }, [events])

  const monthStr = `${year}-${String(month+1).padStart(2,"0")}`
  const monthEvents = events.filter(e => e.start_time.startsWith(monthStr))
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []

  function getLocationIcon(ev: CalendlyEvent) {
    const type = ev.location?.type ?? ""
    if (type === "zoom" || type.includes("video") || ev.location?.join_url) return Video
    if (type === "physical" || type === "outbound_call") return MapPin
    return Globe
  }

  async function handleDisconnect() {
    await fetch("/api/calendly", { method: "DELETE" })
    toast.success("Calendly desconectado")
    onDisconnect()
  }

  return (
    <div className="space-y-4">
      {/* Connected banner */}
      <div className="flex items-center gap-3 p-3 bg-[#006BFF]/5 border border-[#006BFF]/20 rounded-xl">
        <CheckCircle2 className="h-4 w-4 text-[#006BFF] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#006BFF]">Calendly conectado</p>
          <p className="text-[11px] text-muted-foreground truncate">{connectedInfo.name} · {connectedInfo.email}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground shrink-0" onClick={handleDisconnect}>
          <Unlink className="h-3.5 w-3.5 mr-1.5" />Desconectar
        </Button>
      </div>

      {/* Month summary */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {monthEvents.length > 0 ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#006BFF] bg-[#006BFF]/8 px-2.5 py-1 rounded-full border border-[#006BFF]/20">
              <CalendarDays className="h-3 w-3" />
              {monthEvents.length} reunión{monthEvents.length !== 1 ? "es" : ""} este mes
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Sin reuniones este mes</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Cargando reuniones de Calendly…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      ) : (
        <div className="flex gap-4 flex-col lg:flex-row">
          <CalendarGrid
            year={year} month={month} todayStr={todayStr} selectedDate={selectedDate}
            getEvents={(d) => eventsByDate[d] ?? []}
            renderPill={(ev, i) => (
              <div key={i}
                className="block rounded px-1.5 text-[10px] py-0.5 leading-tight truncate font-medium bg-[#006BFF]/10 text-[#006BFF]">
                {ev.invitees[0]?.name ?? ev.name}
              </div>
            )}
            onSelectDate={(d) => setSelectedDate(d === selectedDate ? null : d)}
          />

          {selectedDate && (
            <div className="lg:w-72 lg:shrink-0 border border-border rounded-2xl bg-background shadow-sm p-4 lg:self-start lg:sticky lg:top-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {selectedDate === todayStr ? "Hoy" : "Seleccionado"}
                  </p>
                  <p className="text-sm font-semibold capitalize mt-0.5">{formatTimeFull(selectedDate)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 -mt-0.5" onClick={() => setSelectedDate(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {selectedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Sin reuniones este día</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map(ev => {
                    const LocIcon = getLocationIcon(ev)
                    const uuid = ev.uri.split("/").pop()
                    return (
                      <div key={ev.uri} className="p-3 rounded-xl border border-[#006BFF]/20 bg-[#006BFF]/5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-[#006BFF] leading-snug">{ev.name}</p>
                          <a href={`https://calendly.com/event_types/user/me?event=${uuid}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[#006BFF] opacity-60 hover:opacity-100 shrink-0 mt-0.5"
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                          <span className="text-muted-foreground/60">({formatDuration(ev.start_time, ev.end_time)})</span>
                        </div>

                        {/* Location */}
                        {ev.location && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <LocIcon className="h-3 w-3 shrink-0" />
                            {ev.location.join_url ? (
                              <a href={ev.location.join_url} target="_blank" rel="noopener noreferrer"
                                className="text-[#006BFF] hover:underline truncate">
                                Unirse a la llamada
                              </a>
                            ) : (
                              <span className="truncate">{ev.location.location ?? ev.location.type}</span>
                            )}
                          </div>
                        )}

                        {/* Invitees */}
                        {ev.invitees.length > 0 && (
                          <div className="pt-2 border-t border-[#006BFF]/15 space-y-1">
                            {ev.invitees.map((inv, ii) => (
                              <div key={ii} className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-[#006BFF]/20 text-[#006BFF] text-[9px] font-bold flex items-center justify-center shrink-0">
                                  {inv.name?.[0]?.toUpperCase() ?? "?"}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-medium truncate">{inv.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{inv.email}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CalendarClient({
  tasks, leads, calendlyConnected,
}: {
  tasks: Task[]
  leads: Lead[]
  calendlyConnected: { name: string; email: string } | null
}) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [tab, setTab] = useState<"interno" | "calendly">("interno")
  const [connectedInfo, setConnectedInfo] = useState(calendlyConnected)
  const todayStr = toDateStr(now)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  return (
    <div className="space-y-5">
      <PageHeader title="Calendario" description="Reuniones, cierres y vencimientos de tareas" />

      {/* ── Tabs + month nav ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab("interno")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === "interno"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Tareas
          </button>
          <button
            onClick={() => setTab("calendly")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === "calendly"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
            Calendly
            {connectedInfo && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-0.5" />
            )}
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[9rem] text-center">
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
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      {tab === "interno" ? (
        <InternalCalendar tasks={tasks} leads={leads} year={year} month={month} todayStr={todayStr} />
      ) : connectedInfo ? (
        <CalendlyCalendar
          connectedInfo={connectedInfo}
          onDisconnect={() => setConnectedInfo(null)}
          year={year} month={month} todayStr={todayStr}
        />
      ) : (
        <CalendlySetup onConnected={(info) => setConnectedInfo(info)} />
      )}
    </div>
  )
}
