"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Pencil, Trash2, TrendingUp, TrendingDown, Minus, Target } from "lucide-react"
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

const DEFAULT_CATEGORIES = [
  "Ventas", "Marketing", "Operaciones", "Finanzas",
  "RRHH", "Producto", "Soporte", "General",
]

function derivedStatus(value: number | null, target: number | null) {
  if (value == null || target == null || target === 0) return null
  const pct = (value / target) * 100
  if (pct >= 100) return "on_track"
  if (pct >= 70) return "at_risk"
  return "behind"
}

const STATUS_CONFIG = {
  on_track: { label: "En meta", className: "bg-green-50 text-green-700 border-green-200" },
  at_risk:  { label: "En riesgo", className: "bg-amber-50 text-amber-700 border-amber-200" },
  behind:   { label: "Atrasado", className: "bg-red-50 text-red-700 border-red-200" },
}

function progressPct(value: number | null, target: number | null) {
  if (value == null || target == null || target === 0) return 0
  return Math.min(Math.round((value / target) * 100), 100)
}

function formatMonth(dateStr: string) {
  if (!dateStr) return ""
  const [year, month] = dateStr.split("-")
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleString("es-AR", { month: "long", year: "numeric" })
}

function formatVal(value: number | null, unit: string | null) {
  if (value == null) return "—"
  const num = unit === "$"
    ? value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })
    : `${value.toLocaleString("es-AR")}${unit ? ` ${unit}` : ""}`
  return num
}

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

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  kpi,
  departments,
  onEdit,
  onDelete,
}: {
  kpi: Kpi
  departments: Department[]
  onEdit: (kpi: Kpi) => void
  onDelete: (id: string) => void
}) {
  const pct = progressPct(kpi.metric_value, kpi.metric_target)
  const status = derivedStatus(kpi.metric_value, kpi.metric_target)
  const dept = departments.find((d) => d.id === kpi.department_id)

  const TrendIcon =
    pct >= 100 ? TrendingUp : pct >= 70 ? Minus : TrendingDown

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {formatMonth(kpi.period_month)}
          </p>
          <p className="text-sm font-semibold leading-tight truncate">{kpi.metric_name}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {kpi.category}
            </Badge>
            {dept && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0"
                style={{ borderColor: dept.color + "60", color: dept.color }}
              >
                {dept.name}
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(kpi)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(kpi.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Values */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none">
              {formatVal(kpi.metric_value, kpi.unit)}
            </p>
            {kpi.metric_target != null && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Target className="h-3 w-3" />
                {formatVal(kpi.metric_target, kpi.unit)}
              </p>
            )}
          </div>
          {status && (
            <div className="flex flex-col items-end gap-1">
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                STATUS_CONFIG[status].className
              )}>
                {STATUS_CONFIG[status].label}
              </span>
              <TrendIcon
                className={cn(
                  "h-4 w-4",
                  status === "on_track" ? "text-green-600" :
                  status === "at_risk" ? "text-amber-500" : "text-red-500"
                )}
              />
            </div>
          )}
        </div>

        {/* Progress bar */}
        {kpi.metric_target != null && kpi.metric_target > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  status === "on_track" ? "bg-green-500" :
                  status === "at_risk" ? "bg-amber-400" : "bg-red-400"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">{pct}%</p>
          </div>
        )}

        {kpi.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2">{kpi.notes}</p>
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

  const set = (k: keyof KpiForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

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

    let data: any
    let error: any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    if (editing) {
      const res = await sb.from("kpis").update(payload).eq("id", editing.id).select().single()
      data = res.data
      error = res.error
    } else {
      const res = await sb.from("kpis").insert(payload).select().single()
      data = res.data
      error = res.error
    }

    setSaving(false)
    if (error) {
      toast.error(error.message ?? "Error al guardar")
      return
    }
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
                placeholder="Ventas, Marketing…"
                required
              />
              <datalist id="kpi-categories">
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nombre de la métrica</Label>
            <Input
              value={form.metric_name}
              onChange={(e) => set("metric_name", e.target.value)}
              placeholder="Ej: Leads cerrados, Ingresos netos…"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Valor actual</Label>
              <Input
                type="number"
                value={form.metric_value}
                onChange={(e) => set("metric_value", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Objetivo</Label>
              <Input
                type="number"
                value={form.metric_target}
                onChange={(e) => set("metric_target", e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unidad</Label>
              <Input
                value={form.unit}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="%, $, un."
              />
            </div>
          </div>

          {departments.length > 0 && (
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Select
                value={form.department_id}
                onValueChange={(v) => set("department_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin departamento</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Contexto adicional…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-hover">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear KPI"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

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
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const categories = useMemo(
    () => Array.from(new Set(kpis.map((k) => k.category))).sort(),
    [kpis]
  )
  const months = useMemo(
    () => Array.from(new Set(kpis.map((k) => k.period_month))).sort().reverse(),
    [kpis]
  )

  const filtered = useMemo(() => {
    return kpis.filter((k) => {
      if (filterCategory !== "all" && k.category !== filterCategory) return false
      if (filterMonth !== "all" && k.period_month !== filterMonth) return false
      if (filterStatus !== "all") {
        const s = derivedStatus(k.metric_value, k.metric_target)
        if (s !== filterStatus) return false
      }
      return true
    })
  }, [kpis, filterCategory, filterMonth, filterStatus])

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(kpi: Kpi) {
    setEditing(kpi)
    setDialogOpen(true)
  }

  function requestDelete(id: string) {
    setDeleteTarget(id)
    setConfirmOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setConfirmOpen(false)
    setDeleteTarget(null)
    const supabase = createClient()
    const { error } = await supabase.from("kpis").delete().eq("id", id)
    if (error) { toast.error("No se pudo eliminar"); return }
    setKpis((prev) => prev.filter((k) => k.id !== id))
    toast.success("KPI eliminado")
  }

  function handleSaved(kpi: Kpi) {
    setKpis((prev) => {
      const idx = prev.findIndex((k) => k.id === kpi.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = kpi
        return next
      }
      return [kpi, ...prev]
    })
  }

  // Summary stats
  const totalCount = filtered.length
  const onTrack = filtered.filter((k) => derivedStatus(k.metric_value, k.metric_target) === "on_track").length
  const atRisk = filtered.filter((k) => derivedStatus(k.metric_value, k.metric_target) === "at_risk").length
  const behind = filtered.filter((k) => derivedStatus(k.metric_value, k.metric_target) === "behind").length

  return (
    <div className="space-y-6">
      <PageHeader title="KPIs" description="Métricas clave del negocio por período">
        <Button onClick={openCreate} className="bg-brand hover:bg-brand-hover">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo KPI
        </Button>
      </PageHeader>

      {/* Summary row */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: totalCount, color: "text-foreground" },
            { label: "En meta", value: onTrack, color: "text-green-600" },
            { label: "En riesgo", value: atRisk, color: "text-amber-500" },
            { label: "Atrasados", value: behind, color: "text-red-500" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className={cn("text-2xl font-bold tabular-nums mt-1", color)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      {kpis.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los períodos</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="on_track">En meta</SelectItem>
              <SelectItem value="at_risk">En riesgo</SelectItem>
              <SelectItem value="behind">Atrasados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center mb-4">
              <Target className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm font-medium">
              {kpis.length === 0 ? "Todavía no hay KPIs" : "Sin resultados"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.length === 0
                ? "Creá tu primer KPI para empezar a medir el desempeño del negocio."
                : "Probá cambiando los filtros."}
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
        onClose={() => setDialogOpen(false)}
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
