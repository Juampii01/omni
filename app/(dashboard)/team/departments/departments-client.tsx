"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Pencil, Trash2, Users, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

type Department = {
  id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  parent_id: string | null
  manager_id: string | null
  position: number
  created_at: string
  updated_at: string
}

type Profile = { id: string; full_name: string | null; department_id: string | null; is_active: boolean }

type DeptForm = {
  name: string
  description: string
  color: string
  icon: string
}

// ── Color presets ─────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  "#236461", "#2563eb", "#7c3aed", "#db2777",
  "#ea580c", "#d97706", "#16a34a", "#0891b2",
  "#475569", "#dc2626", "#0a0a0a", "#64748b",
]

const EMPTY_FORM: DeptForm = { name: "", description: "", color: "#236461", icon: "" }

// ── Department Dialog ─────────────────────────────────────────────────────────

function DeptDialog({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: Department | null
  onClose: () => void
  onSaved: (dept: Department) => void
}) {
  const [form, setForm] = useState<DeptForm>(() =>
    editing
      ? { name: editing.name, description: editing.description ?? "", color: editing.color, icon: editing.icon ?? "" }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)

  const set = (k: keyof DeptForm, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return }
    setSaving(true)
    const supabase = createClient()
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      color: form.color,
      icon: form.icon.trim() || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    let data: any, error: any
    if (editing) {
      const res = await sb.from("departments").update(payload).eq("id", editing.id).select().single()
      data = res.data; error = res.error
    } else {
      const res = await sb.from("departments").insert(payload).select().single()
      data = res.data; error = res.error
    }

    setSaving(false)
    if (error) { toast.error(error.message ?? "Error al guardar"); return }
    toast.success(editing ? "Departamento actualizado" : "Departamento creado")
    onSaved(data as Department)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar departamento" : "Nuevo departamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Marketing, Ventas, Producto…"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Descripción opcional"
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none",
                    form.color === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border border-border"
                title="Personalizado"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-hover">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear departamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function DepartmentsClient({
  initialDepts,
  profiles,
}: {
  initialDepts: Department[]
  profiles: Profile[]
}) {
  const [depts, setDepts] = useState<Department[]>(initialDepts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(dept: Department) { setEditing(dept); setDialogOpen(true) }

  async function handleDelete(id: string) {
    const memberCount = profiles.filter((p) => p.department_id === id).length
    if (memberCount > 0) {
      toast.error(`Este departamento tiene ${memberCount} miembro${memberCount !== 1 ? "s" : ""}. Reasignalos antes de eliminar.`)
      return
    }
    if (!confirm("¿Eliminar este departamento?")) return
    const supabase = createClient()
    const { error } = await supabase.from("departments").delete().eq("id", id)
    if (error) { toast.error("No se pudo eliminar"); return }
    setDepts((prev) => prev.filter((d) => d.id !== id))
    toast.success("Departamento eliminado")
  }

  function handleSaved(dept: Department) {
    setDepts((prev) => {
      const idx = prev.findIndex((d) => d.id === dept.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = dept; return n }
      return [...prev, dept]
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/team">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Departamentos"
          description={`${depts.length} departamento${depts.length !== 1 ? "s" : ""}`}
        >
          <Button onClick={openCreate} className="bg-brand hover:bg-brand-hover">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo
          </Button>
        </PageHeader>
      </div>

      {depts.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center mb-4">
              <Users className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm font-medium">Todavía no hay departamentos</p>
            <p className="text-xs text-muted-foreground mt-1">Organizá tu equipo creando departamentos.</p>
            <Button onClick={openCreate} className="mt-4 bg-brand hover:bg-brand-hover">
              <Plus className="h-4 w-4 mr-2" />
              Crear primero
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map((dept) => {
            const count = profiles.filter((p) => p.department_id === dept.id).length
            return (
              <Card key={dept.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg shrink-0"
                        style={{ backgroundColor: dept.color + "30", border: `2px solid ${dept.color}40` }}
                      >
                        <div
                          className="w-full h-full rounded-lg flex items-center justify-center"
                          style={{ color: dept.color }}
                        >
                          <Users className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: dept.color }}>
                          {dept.name}
                        </p>
                        {dept.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {dept.description}
                          </p>
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
                        <DropdownMenuItem onClick={() => openEdit(dept)}>
                          <Pencil className="h-4 w-4 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(dept.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {count} miembro{count !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <DeptDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
