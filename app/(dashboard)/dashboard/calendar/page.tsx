"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { parseLocalDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

type EventItem = { id: string; title: string; description: string; event_date: string; event_type: string }

const TYPE_LABEL: Record<string, string> = { reminder: "Recordatorio", meeting: "Reunión", deadline: "Entrega", other: "Otro" }
const TYPE_VARIANT: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  reminder: "secondary",
  meeting: "default",
  deadline: "destructive",
  other: "outline",
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // lunes=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array.from({ length: startOffset }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[] | null>(null)
  const [cursor, setCursor] = useState(() => new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(() => toDateKey(new Date()))
  const [eventType, setEventType] = useState("other")
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetchWithAuth("/api/omni/calendar")
    const data = await res.json()
    setEvents(data.items ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    for (const e of events ?? []) {
      const list = map.get(e.event_date) ?? []
      list.push(e)
      map.set(e.event_date, list)
    }
    return map
  }, [events])

  const upcoming = useMemo(() => {
    const today = toDateKey(new Date())
    return (events ?? []).filter((e) => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date))
  }, [events])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const cells = useMemo(() => monthGrid(year, month), [year, month])
  const todayKey = toDateKey(new Date())

  async function handleCreate() {
    setSaving(true)
    const res = await fetchWithAuth("/api/omni/calendar", {
      method: "POST",
      body: JSON.stringify({ title, description, event_date: date, event_type: eventType }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo crear el evento")
      return
    }
    setEvents((prev) => [...(prev ?? []), data.item])
    setDialogOpen(false)
    setTitle("")
    setDescription("")
    toast.success("Evento creado")
  }

  async function handleDelete(id: string) {
    await fetchWithAuth(`/api/omni/calendar/${id}`, { method: "DELETE" })
    setEvents((prev) => (prev ?? []).filter((e) => e.id !== id))
  }

  if (events === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl">Calendario</h1>
          <p className="mt-1 text-sm text-muted-foreground">Eventos y recordatorios de tu negocio.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button><Plus /> Nuevo evento</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="flex gap-3">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="reminder">Recordatorio</option>
                  <option value="meeting">Reunión</option>
                  <option value="deadline">Entrega</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={saving || !title.trim()}>
                {saving ? "Creando…" : "Crear evento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-heading text-lg capitalize">{cursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</p>
            <div className="flex gap-1">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1.5">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} className="aspect-square" />
              const key = toDateKey(new Date(year, month, day))
              const dayEvents = eventsByDay.get(key) ?? []
              const isToday = key === todayKey
              return (
                <div
                  key={i}
                  className={`flex aspect-square flex-col gap-0.5 overflow-hidden rounded-lg p-1.5 text-left ${isToday ? "bg-accent" : ""}`}
                >
                  <span className={`text-xs ${isToday ? "font-semibold text-accent-foreground" : "text-muted-foreground"}`}>{day}</span>
                  {dayEvents.slice(0, 2).map((e) => (
                    <span key={e.id} className="truncate rounded bg-primary/15 px-1 text-[9px] text-primary">
                      {e.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 2} más</span>}
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximos eventos</p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin eventos próximos.</p>
          ) : (
            upcoming.slice(0, 12).map((e) => (
              <div key={e.id} className="rounded-xl border border-border/60 bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{e.title}</p>
                  <button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant={TYPE_VARIANT[e.event_type] ?? "outline"} className="text-[10px]">
                    {TYPE_LABEL[e.event_type] ?? e.event_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {parseLocalDate(e.event_date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
                {e.description && <p className="mt-1.5 text-xs text-muted-foreground">{e.description}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
