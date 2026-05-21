"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  Plus, MoreHorizontal, Pencil, Trash2, Target,
  ArrowUpRight, ArrowDownRight, ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

// ── Types ─────────────────────────────────────────────────────────────────────

type Kpi = {
  id: string
  period_month: string
  category: string
  metric_name: string
  metric_value: number | null
  metric_target: number | null
  unit: string | null
  department_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type Department = { id: string; name: string; color: string }

type KpiForm = {
  period_month: string
  category: string
  metric_name: string
  metric_value: string
  metric_target: string
  unit: string
  department_id: string
  notes: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_PALETTE: Record<string, { bg: string; text: string }> = {
  revenue:   { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400" },
  sales:     { bg: "bg-blue-50 dark:bg-blue-950/40",       text: "text-blue-700 dark:text-blue-400" },
  retention: { bg: "bg-violet-50 dark:bg-violet-950/40",   text: "text-violet-700 dark:text-violet-400" },
  growth:    { bg: "bg-cyan-50 dark:bg-cyan-950/40",       text: "text-cyan-700 dark:text-cyan-400" },
  marketing: { bg: "bg-pink-50 dark:bg-pink-950/40",       text: "text-pink-700 dark:text-pink-400" },
  ventas:    { bg: "bg-blue-50 dark:bg-blue-950/40",       text: "text-blue-700 dark:text-blue-400" },
  operaciones:{ bg: "bg-orange-50 dark:bg-orange-950/40",  text: "text-orange-700 dark:text-orange-400" },
  finanzas:  { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400" },
}

function getCategoryStyle(category: string) {
  return CATEGORY_PALETTE[category.toLowerCase()] ??
    { bg: "bg-secondary", text: "text-secondary-foreground" }
}

/** Smart value formatting — no raw unit strings */
function fmt(value: number | null, unit: string | null): string {
  if (value == null) return "—"
  const u = (unit ?? "").toLowerCase().trim()
  if (u === "usd" || u === "$") {
    return `$${value.toLocaleString("en-US")}`
  }
  if (u === "percent" || u === "%") {
    return `${value}%`
  }
  if (u === "score") return String(value)
  if (u === "count") return value.toLocaleString("es-AR")
  return `${value.toLocaleString("es-AR")}${unit ? ` ${unit}` : ""}`
}

function formatMonth(dateStr: string): string {
  if (!dateStr) return ""
  const [y, m] = dateStr.split("-")
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleString("es-AR", { month: "long", year: "numeric" })
}

function formatMonthShort(dateStr: string): string {
  if (!dateStr) return ""
  const [y, m] = dateStr.split("-")
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleString("es-AR", { month: "short", year: "2-digit" })
}

function derivedStatus(value: number | null, target: number | null): "on_track" | "at_risk" | "behind" | null {
  if (value == null || target == null || target === 0) return null
  const pct = (value / target) * 100
  if (pct >= 100) return "on_track"
  if (pct >= 70) return "at_risk"
  return "behind"
}

function progressPct(value: number | null, target: number | null): number {
  if (value == null || target == null || target === 0) return 0
  return Math.min(Math.round((value / target) * 100), 100)
}

const DEFAULT_CATEGORIES = [
  "Ventas", "Marketing", "Operaciones", "Finanzas",
  "RRHH", "Producto", "Soporte", "General",
]

const EMPTY_FORM: KpiForm = {
  period_month: new Date().toISOString().slice(0, 7) + "-01",
  category: "",
  metric_name: "",
  metric_value: "",
  metric_target: "",
  unit: "",
  department_id: "none",
  notes: "",
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ values, status }: { values: number[]; status: ReturnType<typeof derivedStatus> }) {
  if (values.length < 3) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 72; const H = 28
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - 2 - ((v - min) / range) * (H - 4)
    return [x, y] as [number, number]
  })
  const pathD = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const color = status === "on_track" ? "#22c55e" : status === "at_risk" ? "#f59e0b" : status === "behind" ? "#ef4444" : "#94a3b8"

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible opacity-70 shrink-0">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  kpi,
  history,
  departments,
  onEdit,
  onDelete,
}: {
  kpi: Kpi
  history: number[]
  departments: Department[]
  onEdit: (k: Kpi) => void
  onDelete: (id: string) => void
}) {
  const status = derivedStatus(kpi.metric_value, kpi.metric_target)
  const pct = progressPct(kpi.metric_value, kpi.metric_target)
  const cat = getCategoryStyle(kpi.category)

  // Delta vs previous data point
  const delta = useMemo<number | null>(() => {
    if (history.length < 2 || kpi.metric_value == null) return null
    const prev = history[history.length - 2]
    if (prev === 0) return null
    return Math.round(((kpi.metric_value - prev) / prev) * 1000) / 10
  }, [history, kpi.metric_value])

  const borderColor =
    status === "on_track" ? "border-l-green-500"
    : status === "at_risk" ? "border-l-amber-400"
    : status === "behind" ? "border-l-red-400"
    : "border-l-border"

  const barColor =
    status === "on_track" ? "bg-green-500"
    : status === "at_risk" ? "bg-amber-400"
    : "bg-red-400"

  const pctColor =
    status === "on_track" ? "text-green-600"
    : status === "at_risk" ? "text-amber-500"
    : "text-red-500"

  return (
    <Card className={cn(
      "border-border border-l-[3px] shadow-sm hover:shadow-md transition-all duration-200 group",
      borderColor
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Row 1: category + menu */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full", cat.bg, cat.text)}>
            {kpi.category}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(kpi)}>
                <Pencil className="h-4 w-4 mr-2" />Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(kpi.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Row 2: metric name */}
        <p className="text-sm font-medium text-muted-foreground leading-snug">{kpi.metric_name}</p>

        {/* Row 3: value + sparkline */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[1.6rem] font-bold tabular-nums tracking-tight leading-none">
              {fmt(kpi.metric_value, kpi.unit)}
            </p>
            {delta !== null && (
              <p className={cn("flex items-center gap-0.5 mt-1.5 text-xs font-medium",
                delta > 0 ? "text-green-600" : delta < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {delta > 0
                  ? <ArrowUpRight className="h-3 w-3" />
                  : delta < 0
                  ? <ArrowDownRight className="h-3 w-3" />
                  : <ArrowRight className="h-3 w-3" />}
                {delta > 0 ? "+" : ""}{delta}% vs mes ant.
              </p>
            )}
          </div>
          <Sparkline values={history} status={status} />
        </div>

        {/* Row 4: progress bar */}
        {kpi.metric_target != null && kpi.metric_target > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                Meta {fmt(kpi.metric_target, kpi.unit)}
              </p>
              <p className={cn("text-[11px] font-bold tabular-nums", pctColor)}>{pct}%</p>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {kpi.notes && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 border-t border-border pt-2 leading-relaxed">
            {kpi.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── KPI Dialog ────────────────────────────────────────────────────────────────

function KpiDialog({
  open,
  editing,
  departments,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: Kpi | null
  departments: Department[]
  onClose: () => void
  onSaved: (kpi: Kpi) => void
}) {
  const [form, setForm] = useState<KpiForm>(() =>
    editing
      ? {
          period_month: editing.period_month,
          category: editing.category,
          metric_name: editing.metric_name,
          metric_value: editing.metric_value?.toString() ?? "",
          metric_target: editing.metric_target?.toString() ?? "",
          unit: editing.unit ?? "",
          department_id: editing.department_id ?? "none",
          notes: editing.notes ?? "",
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)

  const set = (k: keyof KpiForm, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category.trim() || !form.metric_name.trim()) {
      toast.error("Categoría y nombre son obligatorios")
      return
    }
    setSaving(true)
    const supabase = createClient()
    const payload = {
      period_month: form.period_month || new Date().toISOString().slice(0, 10),
      category: form.category.trim(),
      metric_name: form.metric_name.trim(),
      metric_value: form.metric_value ? Number(form.metric_value) : null,
      metric_target: form.metric_target ? Number(form.metric_target) : null,
      unit: form.unit.trim() || null,
      department_id: form.department_id === "none" ? null : form.department_id || null,
      notes: form.notes.trim() || null,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    let data: any, error: any
    if (editing) {
      const res = await sb.from("kpis").update(payload).eq("id", editing.id).select().single()
      data = res.data; error = res.error
    } else {
      const res = await sb.from("kpis").insert(payload).select().single()
      data = res.data; error = res.error
    }
    setSaving(false)
    if (error) { toast.error(error.message ?? "Error al guardar"); return }
    toast.success(editing ? "KPI actualizado" : "KPI creado")
    onSaved(data as Kpi)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar KPI" : "Nuevo KPI"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Período</Label>
              <Input
                type="month"
                value={form.period_month.slice(0, 7)}
                onChange={(e) => set("period_month", e.target.value + "-01")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Input
                list="kpi-categories"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Ventas, revenue…"
                required
              />
              <datalist id="kpi-categories">
                {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nombre de la métrica</Label>
            <Input
              value={form.metric_name}
              onChange={(e) => set("metric_name", e.target.value)}
              placeholder="Ej: MRR, NPS, Leads calificados…"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Valor actual</Label>
              <Input type="number" value={form.metric_value} onChange={(e) => set("metric_value", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Objetivo</Label>
              <Input type="number" value={form.metric_target} onChange={(e) => set("metric_target", e.target.value)} placeholder="100" />
            </div>
            <div className="space-y-1.5">
              <Label>Unidad</Label>
              <Input list="kpi-units" value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="USD, percent…" />
              <datalist id="kpi-units">
                <option value="USD" />
                <option value="percent" />
                <option value="count" />
                <option value="score" />
              </datalist>
            </div>
          </div>

          {departments.length > 0 && (
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Select value={form.department_id} onValueChange={(v) => set("department_id", v)}>
                <SelectTrigger><SelectValue placeholder="Sin departamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin departamento</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Contexto adicional…" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-hover">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear KPI"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function KpisClient({
  initialKpis,
  departments,
}: {
  initialKpis: Kpi[]
  departments: Department[]
}) {
  const [kpis, setKpis] = useState<Kpi[]>(initialKpis)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Kpi | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Month tabs — sorted descending
  const months = useMemo(
    () => Array.from(new Set(kpis.map((k) => k.period_month))).sort().reverse(),
    [kpis]
  )

  // Default: latest month
  const [activeMonth, setActiveMonth] = useState<string>(() => {
    const sorted = Array.from(new Set(initialKpis.map((k) => k.period_month))).sort()
    return sorted[sorted.length - 1] ?? "all"
  })

  const categories = useMemo(
    () => Array.from(new Set(kpis.map((k) => k.category))).sort(),
    [kpis]
  )

  // Full history per metric (sorted by month) — used for sparklines + deltas
  const metricHistory = useMemo(() => {
    const map: Record<string, number[]> = {}
    const sorted = [...kpis].sort((a, b) => a.period_month.localeCompare(b.period_month))
    sorted.forEach((k) => {
      if (k.metric_value == null) return
      if (!map[k.metric_name]) map[k.metric_name] = []
      map[k.metric_name].push(k.metric_value)
    })
    return map
  }, [kpis])

  const filtered = useMemo(() => {
    return kpis.filter((k) => {
      if (activeMonth !== "all" && k.period_month !== activeMonth) return false
      if (filterCategory !== "all" && k.category !== filterCategory) return false
      if (filterStatus !== "all") {
        if (derivedStatus(k.metric_value, k.metric_target) !== filterStatus) return false
      }
      return true
    })
  }, [kpis, activeMonth, filterCategory, filterStatus])

  const onTrack = filtered.filter((k) => derivedStatus(k.metric_value, k.metric_target) === "on_track").length
  const atRisk  = filtered.filter((k) => derivedStatus(k.metric_value, k.metric_target) === "at_risk").length
  const behind  = filtered.filter((k) => derivedStatus(k.metric_value, k.metric_target) === "behind").length

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(kpi: Kpi) { setEditing(kpi); setDialogOpen(true) }
  function requestDelete(id: string) { setDeleteTarget(id); setConfirmOpen(true) }

  async function handleDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setConfirmOpen(false); setDeleteTarget(null)
    const { error } = await createClient().from("kpis").delete().eq("id", id)
    if (error) { toast.error("No se pudo eliminar"); return }
    setKpis((prev) => prev.filter((k) => k.id !== id))
    toast.success("KPI eliminado")
  }

  function handleSaved(kpi: Kpi) {
    setKpis((prev) => {
      const idx = prev.findIndex((k) => k.id === kpi.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = kpi; return n }
      return [kpi, ...prev]
    })
    // If new kpi's month isn't in tabs, set it as active
    if (!months.includes(kpi.period_month)) setActiveMonth(kpi.period_month)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="KPIs" description="Métricas clave del negocio por período">
        <Button onClick={openCreate} className="bg-brand hover:bg-brand-hover">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo KPI
        </Button>
      </PageHeader>

      {kpis.length > 0 && (
        <>
          {/* ── Month tabs ─────────────────────────────────────────── */}
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setActiveMonth("all")}
              className={cn(
                "flex-shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
                activeMonth === "all"
                  ? "bg-foreground text-background"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              )}
            >
              Todos
            </button>
            {months.map((m) => (
              <button
                key={m}
                onClick={() => setActiveMonth(m)}
                className={cn(
                  "flex-shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
                  activeMonth === m
                    ? "bg-foreground text-background"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                )}
              >
                {formatMonthShort(m)}
              </button>
            ))}
          </div>

          {/* ── Summary strip + filters ─────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground tabular-nums">
                {filtered.length} {filtered.length === 1 ? "métrica" : "métricas"}
                {activeMonth !== "all" && (
                  <span className="ml-1.5 font-medium text-foreground capitalize">
                    — {formatMonth(activeMonth)}
                  </span>
                )}
              </span>
              {onTrack > 0 && (
                <span className="flex items-center gap-1.5 font-medium text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  {onTrack} en meta
                </span>
              )}
              {atRisk > 0 && (
                <span className="flex items-center gap-1.5 font-medium text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  {atRisk} en riesgo
                </span>
              )}
              {behind > 0 && (
                <span className="flex items-center gap-1.5 font-medium text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  {behind} atrasados
                </span>
              )}
            </div>

            {/* Filters */}
            <div className="ml-auto flex gap-2">
              {categories.length > 1 && (
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="on_track">En meta</SelectItem>
                  <SelectItem value="at_risk">En riesgo</SelectItem>
                  <SelectItem value="behind">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {/* ── Grid / Empty ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center mb-4">
              <Target className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm font-medium">
              {kpis.length === 0 ? "Todavía no hay KPIs" : "Sin resultados para estos filtros"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.length === 0
                ? "Creá tu primer KPI para medir el desempeño del negocio."
                : "Probá cambiando los filtros o el período."}
            </p>
            {kpis.length === 0 && (
              <Button onClick={openCreate} className="mt-4 bg-brand hover:bg-brand-hover">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer KPI
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((kpi) => (
            <KpiCard
              key={kpi.id}
              kpi={kpi}
              history={metricHistory[kpi.metric_name] ?? []}
              departments={departments}
              onEdit={openEdit}
              onDelete={requestDelete}
            />
          ))}
        </div>
      )}

      <KpiDialog
        open={dialogOpen}
        editing={editing}
        departments={departments}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar KPI?"
        description="Esta acción no se puede deshacer."
        onConfirm={handleDelete}
      />
    </div>
  )
}
