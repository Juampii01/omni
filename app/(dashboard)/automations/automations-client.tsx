"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"
import {
  Zap, Plus, MoreHorizontal, Pencil, Trash2, Play, Pause,
  CheckCircle2, XCircle, Clock, RefreshCw, Activity, AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"

// ── Types ─────────────────────────────────────────────────────────────────────

type AutoStatus = "active" | "inactive" | "error" | "paused"
type AutoType   = "webhook" | "cron" | "zapier" | "n8n" | "make" | "ai" | "other"

type Automation = {
  id: string
  name: string
  description?: string
  type: AutoType
  status: AutoStatus
  trigger_config: Record<string, any>
  action_config: Record<string, any>
  cron_expression?: string
  last_run_at?: string
  last_run_status?: string
  run_count: number
  error_count: number
  created_at: string
  updated_at: string
}

type Execution = {
  id: string
  automation_id: string
  started_at: string
  finished_at?: string
  status: "running" | "success" | "failed" | "timeout"
  error_message?: string
  duration_ms?: number
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<AutoStatus, { label: string; dot: string; badge: string }> = {
  active:   { label: "Activa",   dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  inactive: { label: "Inactiva", dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border" },
  error:    { label: "Error",    dot: "bg-red-500",     badge: "bg-red-500/10 text-red-500 border-red-500/30" },
  paused:   { label: "Pausada",  dot: "bg-amber-400",   badge: "bg-amber-400/10 text-amber-400 border-amber-400/30" },
}

const TYPE_CFG: Record<AutoType, { label: string; emoji: string }> = {
  webhook: { label: "Webhook",  emoji: "🪝" },
  cron:    { label: "Cron",     emoji: "⏱" },
  zapier:  { label: "Zapier",   emoji: "⚡" },
  n8n:     { label: "n8n",      emoji: "🔗" },
  make:    { label: "Make",     emoji: "🔄" },
  ai:      { label: "AI",       emoji: "🤖" },
  other:   { label: "Otro",     emoji: "⚙️" },
}

const EXEC_STATUS: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  success: { label: "Éxito",  icon: CheckCircle2, className: "text-emerald-500" },
  failed:  { label: "Falló",  icon: XCircle,      className: "text-red-500" },
  running: { label: "Corriendo", icon: RefreshCw, className: "text-blue-400 animate-spin" },
  timeout: { label: "Timeout", icon: AlertCircle, className: "text-amber-400" },
}

// ── Summary ───────────────────────────────────────────────────────────────────

function SummaryRow({ automations }: { automations: Automation[] }) {
  const active   = automations.filter(a => a.status === "active").length
  const errored  = automations.filter(a => a.status === "error").length
  const totalRuns = automations.reduce((s, a) => s + a.run_count, 0)
  const totalErrors = automations.reduce((s, a) => s + a.error_count, 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { label: "Activas",     value: active,        sub: `de ${automations.length}` },
        { label: "Con errores", value: errored,        sub: "necesitan atención" },
        { label: "Ejecuciones", value: totalRuns,      sub: "total histórico" },
        { label: "Errores",     value: totalErrors,    sub: "total histórico" },
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

// ── Form Dialog ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "", description: "", type: "cron" as AutoType, status: "active" as AutoStatus,
  cron_expression: "", notes: "",
}

function AutomationDialog({
  open, editing, onClose, onSaved,
}: {
  open: boolean
  editing: Automation | null
  onClose: () => void
  onSaved: (a: Automation) => void
}) {
  const [form, setForm] = useState(() =>
    editing ? {
      name:            editing.name,
      description:     editing.description ?? "",
      type:            editing.type,
      status:          editing.status,
      cron_expression: editing.cron_expression ?? "",
      notes:           editing.trigger_config?.notes ?? "",
    } : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return }
    setSaving(true)
    const sb = createClient() as any

    const payload: any = {
      name:            form.name.trim(),
      description:     form.description.trim() || null,
      type:            form.type,
      status:          form.status,
      cron_expression: form.cron_expression.trim() || null,
      trigger_config:  form.cron_expression
        ? { schedule: form.cron_expression, notes: form.notes }
        : { notes: form.notes },
      action_config:   {},
      updated_at:      new Date().toISOString(),
    }

    let data: any, error: any
    if (editing) {
      const res = await sb.from("automations").update(payload).eq("id", editing.id).select().single()
      data = res.data; error = res.error
    } else {
      const res = await sb.from("automations").insert(payload).select().single()
      data = res.data; error = res.error
    }

    setSaving(false)
    if (error) { toast.error(error.message ?? "Error al guardar"); return }
    toast.success(editing ? "Automatización actualizada" : "Automatización creada")
    onSaved(data as Automation)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar automatización" : "Nueva automatización"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} autoFocus required />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_CFG) as AutoType[]).map(t => (
                    <SelectItem key={t} value={t}>
                      {TYPE_CFG[t].emoji} {TYPE_CFG[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_CFG) as AutoStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_CFG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Expresión cron</Label>
            <Input value={form.cron_expression} onChange={e => set("cron_expression", e.target.value)} placeholder="0 8 * * * (diario 8am)" className="font-mono text-sm" />
            <p className="text-[10px] text-muted-foreground">Formato: minuto hora día mes día-semana</p>
          </div>
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Contexto adicional..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand/90">
              {saving ? "Guardando…" : editing ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Automation card ───────────────────────────────────────────────────────────

function AutoCard({
  auto, executions, onEdit, onDelete, onToggle,
}: {
  auto: Automation
  executions: Execution[]
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const statusCfg = STATUS_CFG[auto.status]
  const typeCfg   = TYPE_CFG[auto.type]
  const myExecs   = executions.filter(e => e.automation_id === auto.id).slice(0, 5)
  const lastExec  = myExecs[0]
  const isActive  = auto.status === "active"

  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 space-y-3 transition-colors",
      auto.status === "error" ? "border-red-500/30" : "border-border hover:border-brand/20"
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg flex-shrink-0">
          {typeCfg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{auto.name}</p>
          {auto.description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{auto.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6"
            title={isActive ? "Pausar" : "Activar"}
            onClick={onToggle}
          >
            {isActive
              ? <Pause className="h-3.5 w-3.5 text-muted-foreground" />
              : <Play className="h-3.5 w-3.5 text-brand" />
            }
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border", statusCfg.badge)}>
          <span className={cn("w-1 h-1 rounded-full", statusCfg.dot)} />
          {statusCfg.label}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {typeCfg.label}
        </span>
        {auto.cron_expression && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {auto.cron_expression}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          {auto.run_count} runs
        </span>
        {auto.error_count > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <XCircle className="h-3 w-3" />
            {auto.error_count} errores
          </span>
        )}
        {auto.last_run_at && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(auto.last_run_at), { addSuffix: true, locale: es })}
          </span>
        )}
      </div>

      {/* Mini execution log */}
      {myExecs.length > 0 && (
        <div className="pt-2 border-t border-border/50 space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Últimas ejecuciones</p>
          {myExecs.map(ex => {
            const cfg = EXEC_STATUS[ex.status] ?? EXEC_STATUS.success
            const Icon = cfg.icon
            return (
              <div key={ex.id} className="flex items-center gap-2">
                <Icon className={cn("h-3 w-3 flex-shrink-0", cfg.className)} />
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(ex.started_at), "dd/MM HH:mm")}
                </span>
                {ex.duration_ms && (
                  <span className="text-[10px] text-muted-foreground">{ex.duration_ms}ms</span>
                )}
                {ex.error_message && (
                  <span className="text-[10px] text-red-400 truncate">{ex.error_message}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AutomationsClient({
  initialAutomations,
  recentExecutions,
}: {
  initialAutomations: Automation[]
  recentExecutions: Execution[]
}) {
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Automation | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function openEdit(a: Automation) { setEditing(a); setDialogOpen(true) }
  function openCreate() { setEditing(null); setDialogOpen(true) }

  async function handleToggle(a: Automation) {
    const newStatus: AutoStatus = a.status === "active" ? "paused" : "active"
    const sb = createClient() as any
    const { error } = await sb.from("automations").update({ status: newStatus }).eq("id", a.id)
    if (error) { toast.error(error.message); return }
    setAutomations(prev => prev.map(x => x.id === a.id ? { ...x, status: newStatus } : x))
    toast.success(newStatus === "active" ? "Automatización activada" : "Automatización pausada")
  }

  async function handleDelete() {
    if (!confirmId) return
    const id = confirmId
    setConfirmId(null)
    const sb = createClient() as any
    const { error } = await sb.from("automations").delete().eq("id", id)
    if (error) { toast.error("No se pudo eliminar"); return }
    setAutomations(prev => prev.filter(a => a.id !== id))
    toast.success("Automatización eliminada")
  }

  function handleSaved(a: Automation) {
    setAutomations(prev => {
      const idx = prev.findIndex(x => x.id === a.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = a; return next }
      return [a, ...prev]
    })
  }

  const activeOnes  = automations.filter(a => a.status === "active")
  const pausedOnes  = automations.filter(a => a.status !== "active")

  return (
    <div className="space-y-6">
      <PageHeader title="Automatizaciones" description={`${automations.length} workflows configurados`} icon={Zap}>
        <Button onClick={openCreate} className="bg-brand hover:bg-brand/90">
          <Plus className="h-4 w-4 mr-2" />
          Nueva automatización
        </Button>
      </PageHeader>

      <SummaryRow automations={automations} />

      {/* Active */}
      {activeOnes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Activas ({activeOnes.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeOnes.map(a => (
              <AutoCard
                key={a.id}
                auto={a}
                executions={recentExecutions}
                onEdit={() => openEdit(a)}
                onDelete={() => setConfirmId(a.id)}
                onToggle={() => handleToggle(a)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive / paused */}
      {pausedOnes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Inactivas / Pausadas ({pausedOnes.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 opacity-60">
            {pausedOnes.map(a => (
              <AutoCard
                key={a.id}
                auto={a}
                executions={recentExecutions}
                onEdit={() => openEdit(a)}
                onDelete={() => setConfirmId(a.id)}
                onToggle={() => handleToggle(a)}
              />
            ))}
          </div>
        </div>
      )}

      {automations.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="h-5 w-5 text-brand" />
          </div>
          <p className="text-sm font-medium">Sin automatizaciones todavía</p>
          <p className="text-xs text-muted-foreground mt-1">Creá tu primer workflow para automatizar tu operación.</p>
          <Button onClick={openCreate} className="mt-4 bg-brand hover:bg-brand/90">
            <Plus className="h-4 w-4 mr-2" />
            Nueva automatización
          </Button>
        </div>
      )}

      <AutomationDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={v => !v && setConfirmId(null)}
        title="¿Eliminar automatización?"
        description="Se eliminarán también los logs de ejecución."
        onConfirm={handleDelete}
      />
    </div>
  )
}
