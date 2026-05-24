"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Rocket, Plus, MoreHorizontal, Pencil, Trash2, Users, DollarSign, Youtube, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type LaunchStatus = "planning" | "active" | "live" | "closed" | "cancelled"

type Launch = {
  id: string
  name: string
  description?: string
  status: LaunchStatus
  start_date?: string
  end_date?: string
  youtube_stream_url?: string
  target_revenue?: number
  actual_revenue?: number
  participant_count: number
  coupon_code?: string
  coupon_discount_pct?: number
  created_at: string
}

type Participant = {
  id: string
  launch_id: string
  full_name: string
  email?: string
  paid: boolean
  amount_paid?: number
  registered_at: string
}

// ── Config ─────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<LaunchStatus, { label: string; badge: string; dot: string }> = {
  planning:  { label: "Planificando", badge: "bg-muted text-muted-foreground border-border",            dot: "bg-muted-foreground" },
  active:    { label: "Activo",       badge: "bg-blue-500/10 text-blue-400 border-blue-400/30",        dot: "bg-blue-400" },
  live:      { label: "🔴 En vivo",   badge: "bg-red-500/10 text-red-400 border-red-400/30",           dot: "bg-red-400 animate-pulse" },
  closed:    { label: "Cerrado",      badge: "bg-brand/10 text-brand border-brand/30",                 dot: "bg-brand" },
  cancelled: { label: "Cancelado",    badge: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
}

function fmtDate(d?: string) {
  if (!d) return "—"
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtUSD(n?: number) {
  if (!n) return "—"
  return `$${n.toLocaleString("en-US")}`
}

// ── Launch Dialog ─────────────────────────────────────────────────────────────

const EMPTY_LAUNCH = {
  name: "", description: "", status: "planning" as LaunchStatus,
  start_date: "", end_date: "", youtube_stream_url: "",
  target_revenue: "", coupon_code: "", coupon_discount_pct: "",
}

function LaunchDialog({ open, editing, onClose, onSaved }: {
  open: boolean; editing: Launch | null
  onClose: () => void; onSaved: (l: Launch) => void
}) {
  const [form, setForm] = useState(() => editing ? {
    name: editing.name,
    description: editing.description ?? "",
    status: editing.status,
    start_date: editing.start_date ?? "",
    end_date: editing.end_date ?? "",
    youtube_stream_url: editing.youtube_stream_url ?? "",
    target_revenue: editing.target_revenue?.toString() ?? "",
    coupon_code: editing.coupon_code ?? "",
    coupon_discount_pct: editing.coupon_discount_pct?.toString() ?? "",
  } : { ...EMPTY_LAUNCH })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return }
    setSaving(true)
    const sb = createClient() as any
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      youtube_stream_url: form.youtube_stream_url.trim() || null,
      target_revenue: form.target_revenue ? parseFloat(form.target_revenue) : null,
      coupon_code: form.coupon_code.trim() || null,
      coupon_discount_pct: form.coupon_discount_pct ? parseFloat(form.coupon_discount_pct) : null,
      updated_at: new Date().toISOString(),
    }
    let data: any, error: any
    if (editing) {
      const res = await sb.from("launches").update(payload).eq("id", editing.id).select().single()
      data = res.data; error = res.error
    } else {
      const res = await sb.from("launches").insert(payload).select().single()
      data = res.data; error = res.error
    }
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(editing ? "Lanzamiento actualizado" : "Lanzamiento creado")
    onSaved(data as Launch)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Editar lanzamiento" : "Nuevo lanzamiento"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Lanzamiento Mayo 2026" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} placeholder="Detalles del lanzamiento..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_CFG) as LaunchStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_CFG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Revenue objetivo</Label>
              <Input type="number" min="0" step="0.01" value={form.target_revenue} onChange={e => set("target_revenue", e.target.value)} placeholder="10000" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha inicio</Label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha fin</Label>
              <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>YouTube Stream URL</Label>
            <Input value={form.youtube_stream_url} onChange={e => set("youtube_stream_url", e.target.value)} placeholder="https://youtube.com/live/..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Código de cupón</Label>
              <Input value={form.coupon_code} onChange={e => set("coupon_code", e.target.value.toUpperCase())} placeholder="LANZAMIENTO30" />
            </div>
            <div className="space-y-1.5">
              <Label>Descuento (%)</Label>
              <Input type="number" min="0" max="100" value={form.coupon_discount_pct} onChange={e => set("coupon_discount_pct", e.target.value)} placeholder="30" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand/90">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear lanzamiento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Launch Card ───────────────────────────────────────────────────────────────

function LaunchCard({
  launch, participants, onEdit, onDelete,
}: {
  launch: Launch; participants: Participant[]
  onEdit: () => void; onDelete: () => void
}) {
  const [showParticipants, setShowParticipants] = useState(false)
  const cfg = STATUS_CFG[launch.status]
  const paid = participants.filter(p => p.paid)
  const revenue = paid.reduce((s, p) => s + (p.amount_paid ?? 0), 0)
  const progress = launch.target_revenue ? Math.min(100, Math.round((revenue / launch.target_revenue) * 100)) : null

  return (
    <Card className="border-border hover:border-brand/20 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <CardTitle className="text-sm font-semibold">{launch.name}</CardTitle>
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1", cfg.badge)}>
                <span className={cn("w-1 h-1 rounded-full", cfg.dot)} />{cfg.label}
              </span>
            </div>
            {launch.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{launch.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Users className="h-3 w-3" />
            </div>
            <p className="text-base font-bold tabular-nums font-mono">{participants.length}</p>
            <p className="text-[10px] text-muted-foreground">participantes</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <DollarSign className="h-3 w-3" />
            </div>
            <p className="text-base font-bold tabular-nums font-mono">{fmtUSD(revenue || undefined)}</p>
            <p className="text-[10px] text-muted-foreground">recaudado</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-base font-bold tabular-nums font-mono">{fmtDate(launch.start_date)}</p>
            <p className="text-[10px] text-muted-foreground">inicio</p>
          </div>
        </div>

        {/* Progress bar */}
        {progress !== null && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Progreso revenue</span>
              <span>{progress}% de {fmtUSD(launch.target_revenue)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* YouTube link */}
        {launch.youtube_stream_url && (
          <a
            href={launch.youtube_stream_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 mt-1"
          >
            <Youtube className="h-3.5 w-3.5" />
            Ver stream
          </a>
        )}

        {/* Coupon */}
        {launch.coupon_code && (
          <div className="mt-1 text-xs text-muted-foreground">
            Cupón: <span className="font-mono font-semibold text-foreground">{launch.coupon_code}</span>
            {launch.coupon_discount_pct && <span> ({launch.coupon_discount_pct}% OFF)</span>}
          </div>
        )}
      </CardHeader>

      {/* Participants toggle */}
      {participants.length > 0 && (
        <>
          <button
            onClick={() => setShowParticipants(p => !p)}
            className="w-full flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
          >
            <span>{participants.length} participantes · {paid.length} pagaron</span>
            {showParticipants ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showParticipants && (
            <div className="border-t border-border divide-y divide-border">
              {participants.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <div>
                    <p className="font-medium">{p.full_name}</p>
                    {p.email && <p className="text-muted-foreground">{p.email}</p>}
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      p.paid ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"
                    )}>
                      {p.paid ? `Pagó ${p.amount_paid ? fmtUSD(p.amount_paid) : "✓"}` : "Sin pago"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ launches, participants }: { launches: Launch[]; participants: Participant[] }) {
  const active = launches.filter(l => l.status === "active" || l.status === "live")
  const totalRevenue = participants.filter(p => p.paid).reduce((s, p) => s + (p.amount_paid ?? 0), 0)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: "Lanzamientos",  value: launches.length,       sub: "en total" },
        { label: "Activos",        value: active.length,          sub: "en progreso" },
        { label: "Participantes",  value: participants.length,    sub: "en total" },
        { label: "Revenue total",  value: fmtUSD(totalRevenue) || "$0", sub: "recaudado" },
      ].map(({ label, value, sub }) => (
        <div key={label} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold tabular-nums font-mono">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function LaunchesClient({
  initialLaunches, initialParticipants,
}: {
  initialLaunches: Launch[]
  initialParticipants: Participant[]
}) {
  const [launches, setLaunches] = useState<Launch[]>(initialLaunches)
  const [participants] = useState<Participant[]>(initialParticipants)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Launch | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const participantsByLaunch = useMemo(() => {
    const map: Record<string, Participant[]> = {}
    for (const p of participants) {
      if (!map[p.launch_id]) map[p.launch_id] = []
      map[p.launch_id].push(p)
    }
    return map
  }, [participants])

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(l: Launch) { setEditing(l); setDialogOpen(true) }
  function requestDelete(id: string) { setDeleteTarget(id); setConfirmOpen(true) }

  async function handleDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setConfirmOpen(false); setDeleteTarget(null)
    const sb = createClient() as any
    const { error } = await sb.from("launches").delete().eq("id", id)
    if (error) { toast.error("No se pudo eliminar"); return }
    setLaunches(prev => prev.filter(l => l.id !== id))
    toast.success("Lanzamiento eliminado")
  }

  function handleSaved(l: Launch) {
    setLaunches(prev => {
      const idx = prev.findIndex(x => x.id === l.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = l; return next }
      return [l, ...prev]
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lanzamientos"
        description="Gestión de campañas de lanzamiento, participantes y métricas de revenue."
        icon={Rocket}
      >
        <Button onClick={openCreate} className="bg-brand hover:bg-brand/90">
          <Plus className="h-4 w-4 mr-2" />Nuevo lanzamiento
        </Button>
      </PageHeader>

      <SummaryCards launches={launches} participants={participants} />

      {launches.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-brand" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Sin lanzamientos todavía</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Creá tu primer lanzamiento para gestionar participantes, cupones y revenue.
              </p>
            </div>
            <Button onClick={openCreate} className="bg-brand hover:bg-brand/90">
              <Plus className="h-4 w-4 mr-2" />Crear lanzamiento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {launches.map(l => (
            <LaunchCard
              key={l.id}
              launch={l}
              participants={participantsByLaunch[l.id] ?? []}
              onEdit={() => openEdit(l)}
              onDelete={() => requestDelete(l.id)}
            />
          ))}
        </div>
      )}

      <LaunchDialog open={dialogOpen} editing={editing} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />
      <ConfirmDialog
        open={confirmOpen} onOpenChange={setConfirmOpen}
        title="¿Eliminar lanzamiento?"
        description="Se eliminarán también todos los participantes del lanzamiento."
        onConfirm={handleDelete}
      />
    </div>
  )
}
