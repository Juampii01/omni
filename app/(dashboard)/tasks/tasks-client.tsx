"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Pencil, Trash2, CheckSquare, AlertCircle, ArrowUp, Flame } from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import {
  TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS,
  type TaskStatus, type TaskPriority,
} from "@/lib/constants"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

// ── Types ─────────────────────────────────────────────────────────────────────
type Task = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  created_by: string
  department_id: string | null
  due_date: string | null
  tags: string[]
  deleted_at: string | null
  created_at: string
}
type Profile = { id: string; full_name: string | null; avatar_url: string | null }
type Department = { id: string; name: string; color: string }

type TaskForm = {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string
  department_id: string
  due_date: string
}

const KANBAN_COLS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "backlog",     label: "Backlog",       color: "border-t-slate-400" },
  { status: "todo",        label: "Por hacer",     color: "border-t-blue-400" },
  { status: "in_progress", label: "En progreso",   color: "border-t-amber-400" },
  { status: "review",      label: "En revisión",   color: "border-t-purple-400" },
  { status: "done",        label: "Completado",    color: "border-t-green-400" },
]

const PRIORITY_ICONS: Record<TaskPriority, React.ReactNode> = {
  low:    <ArrowUp className="h-3 w-3 rotate-180 text-muted-foreground" />,
  medium: <ArrowUp className="h-3 w-3 text-amber-500" />,
  high:   <AlertCircle className="h-3 w-3 text-orange-500" />,
  urgent: <Flame className="h-3 w-3 text-destructive" />,
}

const EMPTY_FORM: TaskForm = {
  title: "", description: "", status: "todo", priority: "medium",
  assigned_to: "none", department_id: "none", due_date: "",
}

// ── Task Dialog ───────────────────────────────────────────────────────────────
function TaskDialog({ open, editing, defaultStatus, profiles, departments, currentUserId, onClose, onSaved }: {
  open: boolean
  editing: Task | null
  defaultStatus: TaskStatus
  profiles: Profile[]
  departments: Department[]
  currentUserId: string
  onClose: () => void
  onSaved: (task: Task) => void
}) {
  const [form, setForm] = useState<TaskForm>(() => editing ? {
    title: editing.title,
    description: editing.description ?? "",
    status: editing.status,
    priority: editing.priority,
    assigned_to: editing.assigned_to ?? "none",
    department_id: editing.department_id ?? "none",
    due_date: editing.due_date ? editing.due_date.slice(0, 10) : "",
  } : { ...EMPTY_FORM, status: defaultStatus })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof TaskForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error("El título es obligatorio"); return }
    setSaving(true)
    const sb = createClient() as any
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      assigned_to: form.assigned_to === "none" ? null : form.assigned_to || null,
      department_id: form.department_id === "none" ? null : form.department_id || null,
      due_date: form.due_date || null,
      created_by: currentUserId,
    }
    let data: any, error: any
    if (editing) {
      const r = await sb.from("tasks").update(payload).eq("id", editing.id).select().single()
      data = r.data; error = r.error
    } else {
      const r = await sb.from("tasks").insert(payload).select().single()
      data = r.data; error = r.error
    }
    setSaving(false)
    if (error) { toast.error(error.message ?? "Error al guardar"); return }
    toast.success(editing ? "Tarea actualizada" : "Tarea creada")
    onSaved(data as Task)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? "Editar tarea" : "Nueva tarea"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="¿Qué hay que hacer?" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} placeholder="Detalles adicionales…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Asignado a</Label>
              <Select value={form.assigned_to} onValueChange={v => set("assigned_to", v)}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Vencimiento</Label>
              <Input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-hover">
              {saving ? "Guardando…" : editing ? "Guardar" : "Crear tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, profiles, onEdit, onDelete, onStatusChange }: {
  task: Task
  profiles: Profile[]
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}) {
  const assignee = profiles.find(p => p.id === task.assigned_to)
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done"

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow cursor-default group">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium leading-snug flex-1">{task.title}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => onEdit(task)} className="text-xs">
                <Pencil className="h-3.5 w-3.5 mr-2" />Editar
              </DropdownMenuItem>
              {KANBAN_COLS.filter(c => c.status !== task.status).map(col => (
                <DropdownMenuItem key={col.status} onClick={() => onStatusChange(task.id, col.status)} className="text-xs">
                  → {col.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem className="text-destructive focus:text-destructive text-xs" onClick={() => onDelete(task.id)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" />Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px]">
              {PRIORITY_ICONS[task.priority]}
              <span className={cn("text-[10px]", TASK_PRIORITY_COLORS[task.priority])}>
                {TASK_PRIORITY_LABELS[task.priority]}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {task.due_date && (
              <span className={cn("text-[10px]", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                {new Date(task.due_date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
              </span>
            )}
            {assignee && (
              <Avatar className="h-5 w-5">
                {assignee.avatar_url && <AvatarImage src={assignee.avatar_url} />}
                <AvatarFallback className="text-[9px] bg-brand-soft text-brand">
                  {getInitials(assignee.full_name ?? "")}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function TasksClient({ initialTasks, profiles, departments, currentUserId }: {
  initialTasks: Task[]
  profiles: Profile[]
  departments: Department[]
  currentUserId: string
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function openCreate(status: TaskStatus = "todo") { setEditing(null); setDefaultStatus(status); setDialogOpen(true) }
  function openEdit(t: Task) { setEditing(t); setDialogOpen(true) }

  function handleSaved(task: Task) {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = task; return n }
      return [task, ...prev]
    })
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
    const sb = createClient() as any
    const { error } = await sb.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id)
    if (error) { toast.error("No se pudo eliminar"); return }
    setTasks(prev => prev.filter(t => t.id !== id))
    toast.success("Tarea eliminada")
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    const sb = createClient() as any
    const extra = status === "done" ? { completed_at: new Date().toISOString() } : { completed_at: null }
    const { error } = await sb.from("tasks").update({ status, ...extra }).eq("id", id)
    if (error) { toast.error("No se pudo mover"); return }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, ...extra } : t))
  }

  const byStatus = (status: TaskStatus) => tasks.filter(t => t.status === status)
  const totalActive = tasks.filter(t => !["done", "cancelled"].includes(t.status)).length

  return (
    <div className="space-y-6">
      <PageHeader title="Tareas" description={`${totalActive} activa${totalActive !== 1 ? "s" : ""}`}>
        <Button onClick={() => openCreate()} className="bg-brand hover:bg-brand-hover">
          <Plus className="h-4 w-4 mr-2" />Nueva tarea
        </Button>
      </PageHeader>

      {tasks.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center mb-4">
              <CheckSquare className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm font-medium">Todavía no hay tareas</p>
            <p className="text-xs text-muted-foreground mt-1">Creá tu primera tarea para empezar a organizar el trabajo.</p>
            <Button onClick={() => openCreate()} className="mt-4 bg-brand hover:bg-brand-hover">
              <Plus className="h-4 w-4 mr-2" />Crear primera tarea
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {KANBAN_COLS.map(col => {
            const colTasks = byStatus(col.status)
            return (
              <div key={col.status} className="space-y-2">
                <div className={cn("border-t-2 pt-2 flex items-center justify-between", col.color)}>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{col.label}</span>
                  <span className="text-xs font-bold tabular-nums">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      profiles={profiles}
                      onEdit={openEdit}
                      onDelete={requestDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                  <button
                    onClick={() => openCreate(col.status)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg py-2 hover:border-brand/40 transition-colors"
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        editing={editing}
        defaultStatus={defaultStatus}
        profiles={profiles}
        departments={departments}
        currentUserId={currentUserId}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar tarea?"
        description="Esta acción no se puede deshacer."
        onConfirm={handleDelete}
      />
    </div>
  )
}
