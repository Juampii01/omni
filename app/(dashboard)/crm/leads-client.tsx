"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, GitBranch, DollarSign } from "lucide-react"
import { cn, getInitials, formatCurrency } from "@/lib/utils"
import { LEAD_STAGE_LABELS, LEAD_STAGE_COLORS, type LeadStage } from "@/lib/constants"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────
type Lead = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  source: string | null
  stage: LeadStage
  amount: number
  expected_close_date: string | null
  notes: string | null
  tags: string[]
  assigned_to: string | null
  department_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}
type Profile = { id: string; full_name: string | null; avatar_url: string | null }
type Department = { id: string; name: string; color: string }

type LeadForm = {
  full_name: string
  email: string
  phone: string
  source: string
  stage: LeadStage
  amount: string
  expected_close_date: string
  notes: string
  assigned_to: string
  department_id: string
}

const EMPTY_FORM: LeadForm = {
  full_name: "", email: "", phone: "", source: "",
  stage: "new", amount: "", expected_close_date: "",
  notes: "", assigned_to: "none", department_id: "none",
}

const SOURCES = ["Instagram", "Facebook Ads", "Google Ads", "Referido", "Web", "LinkedIn", "WhatsApp", "Otro"]

// ── Lead Dialog ───────────────────────────────────────────────────────────────
function LeadDialog({ open, editing, profiles, departments, onClose, onSaved }: {
  open: boolean
  editing: Lead | null
  profiles: Profile[]
  departments: Department[]
  onClose: () => void
  onSaved: (lead: Lead) => void
}) {
  const [form, setForm] = useState<LeadForm>(() => editing ? {
    full_name: editing.full_name,
    email: editing.email ?? "",
    phone: editing.phone ?? "",
    source: editing.source ?? "",
    stage: editing.stage,
    amount: editing.amount?.toString() ?? "",
    expected_close_date: editing.expected_close_date ?? "",
    notes: editing.notes ?? "",
    assigned_to: editing.assigned_to ?? "none",
    department_id: editing.department_id ?? "none",
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof LeadForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error("El nombre es obligatorio"); return }
    setSaving(true)
    const sb = createClient() as any
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      source: form.source || null,
      stage: form.stage,
      amount: form.amount ? Number(form.amount) : 0,
      expected_close_date: form.expected_close_date || null,
      notes: form.notes.trim() || null,
      assigned_to: form.assigned_to === "none" ? null : form.assigned_to || null,
      department_id: form.department_id === "none" ? null : form.department_id || null,
    }
    let data: any, error: any
    if (editing) {
      const r = await sb.from("leads").update(payload).eq("id", editing.id).select().single()
      data = r.data; error = r.error
    } else {
      const r = await sb.from("leads").insert(payload).select().single()
      data = r.data; error = r.error
    }
    setSaving(false)
    if (error) { toast.error(error.message ?? "Error al guardar"); return }
    toast.success(editing ? "Lead actualizado" : "Lead creado")
    onSaved(data as Lead)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Editar lead" : "Nuevo lead"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre completo *</Label>
              <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Juan García" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="juan@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+54 9 11 …" />
            </div>
            <div className="space-y-1.5">
              <Label>Origen</Label>
              <Input list="lead-sources" value={form.source} onChange={e => set("source", e.target.value)} placeholder="Instagram, Google…" />
              <datalist id="lead-sources">{SOURCES.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select value={form.stage} onValueChange={v => set("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_STAGE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor estimado ($)</Label>
              <Input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Cierre estimado</Label>
              <Input type="date" value={form.expected_close_date} onChange={e => set("expected_close_date", e.target.value)} />
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
            {departments.length > 0 && (
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Select value={form.department_id} onValueChange={v => set("department_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2 space-y-1.5">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Contexto, necesidades, próximos pasos…" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-hover">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Stage summary bar ─────────────────────────────────────────────────────────
function StageSummary({ leads }: { leads: Lead[] }) {
  const stages: LeadStage[] = ["new", "qualified", "meeting_scheduled", "meeting_done", "proposal_sent", "negotiation", "won", "lost"]
  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
      {stages.map(stage => {
        const count = leads.filter(l => l.stage === stage).length
        return (
          <div key={stage} className="text-center">
            <p className="text-lg font-bold tabular-nums">{count}</p>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", LEAD_STAGE_COLORS[stage])}>
              {LEAD_STAGE_LABELS[stage]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function LeadsClient({ initialLeads, profiles, departments }: {
  initialLeads: Lead[]
  profiles: Profile[]
  departments: Department[]
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState("")
  const [filterStage, setFilterStage] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)

  const filtered = useMemo(() => leads.filter(l => {
    if (filterStage !== "all" && l.stage !== filterStage) return false
    if (search) {
      const q = search.toLowerCase()
      return l.full_name.toLowerCase().includes(q)
        || l.email?.toLowerCase().includes(q)
        || l.source?.toLowerCase().includes(q)
    }
    return true
  }), [leads, search, filterStage])

  const totalValue = filtered.reduce((s, l) => s + (l.amount ?? 0), 0)

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(l: Lead) { setEditing(l); setDialogOpen(true) }

  function handleSaved(lead: Lead) {
    setLeads(prev => {
      const idx = prev.findIndex(l => l.id === lead.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = lead; return n }
      return [lead, ...prev]
    })
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este lead?")) return
    const sb = createClient() as any
    const { error } = await sb.from("leads").update({ deleted_at: new Date().toISOString() }).eq("id", id)
    if (error) { toast.error("No se pudo eliminar"); return }
    setLeads(prev => prev.filter(l => l.id !== id))
    toast.success("Lead eliminado")
  }

  function getAssignee(id: string | null) {
    return profiles.find(p => p.id === id) ?? null
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Leads" description={`${leads.length} contactos · ${formatCurrency(totalValue, "USD")} en pipeline`}>
        <div className="flex items-center gap-2">
          <Link href="/crm/pipeline">
            <Button variant="outline" size="sm"><GitBranch className="h-4 w-4 mr-2" />Pipeline</Button>
          </Link>
          <Button onClick={openCreate} className="bg-brand hover:bg-brand-hover">
            <Plus className="h-4 w-4 mr-2" />Nuevo lead
          </Button>
        </div>
      </PageHeader>

      {/* Stage summary */}
      {leads.length > 0 && (
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <StageSummary leads={leads} />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar leads…" className="pl-9 h-8 text-sm" />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Etapa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las etapas</SelectItem>
            {Object.entries(LEAD_STAGE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center mb-4">
              <DollarSign className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm font-medium">{leads.length === 0 ? "Todavía no hay leads" : "Sin resultados"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {leads.length === 0 ? "Creá tu primer lead para empezar a gestionar el pipeline." : "Probá cambiando los filtros."}
            </p>
            {leads.length === 0 && (
              <Button onClick={openCreate} className="mt-4 bg-brand hover:bg-brand-hover">
                <Plus className="h-4 w-4 mr-2" />Crear primer lead
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contacto</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Asignado</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(lead => {
                const assignee = getAssignee(lead.assigned_to)
                return (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell>
                      <p className="text-sm font-medium">{lead.full_name}</p>
                      {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-xs px-2 py-1 rounded-full font-medium", LEAD_STAGE_COLORS[lead.stage])}>
                        {LEAD_STAGE_LABELS[lead.stage]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums font-medium">
                      {lead.amount > 0 ? formatCurrency(lead.amount, "USD") : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {assignee.avatar_url && <AvatarImage src={assignee.avatar_url} />}
                            <AvatarFallback className="text-[10px] bg-brand-soft text-brand">
                              {getInitials(assignee.full_name ?? "")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{assignee.full_name}</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {lead.source
                        ? <Badge variant="outline" className="text-[10px]">{lead.source}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(lead)}>
                            <Pencil className="h-4 w-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(lead.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <LeadDialog
        open={dialogOpen}
        editing={editing}
        profiles={profiles}
        departments={departments}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
