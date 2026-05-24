"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"
import {
  ArrowLeft, Mail, Phone, Instagram, Hash, Globe, AlertTriangle,
  Plus, Pencil, Trash2, Star, TrendingUp, Calendar, DollarSign,
  CheckSquare, ChevronRight, Users,
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// ── Types ─────────────────────────────────────────────────────────────────────

type Contact = {
  id: string
  client_id: string
  name: string
  email?: string
  phone?: string
  role?: string
  is_primary: boolean
  notes?: string
  avatar_url?: string
}

type RevenueRecord = {
  id: string
  period_month: string
  category: string
  amount: number
  currency: string
  description?: string
}

type Task = {
  id: string
  title: string
  status: string
  priority: string
  due_date?: string
  tags: string[]
}

type AnyClient = Record<string, any>

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  active:          { label: "Activo",         dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  prospect:        { label: "Prospecto",       dot: "bg-blue-400",    badge: "bg-blue-400/10 text-blue-400 border-blue-400/30" },
  at_risk:         { label: "En riesgo",       dot: "bg-orange-500",  badge: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
  paused:          { label: "Pausado",         dot: "bg-amber-400",   badge: "bg-amber-400/10 text-amber-400 border-amber-400/30" },
  internal_paused: { label: "Pausado interno", dot: "bg-violet-400",  badge: "bg-violet-400/10 text-violet-400 border-violet-400/30" },
  churned:         { label: "Churn",           dot: "bg-red-500",     badge: "bg-red-500/10 text-red-500 border-red-500/30" },
  completed:       { label: "Completado",      dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border" },
}

const PRIORITY_CFG: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgente", className: "text-red-500" },
  high:   { label: "Alta",    className: "text-orange-400" },
  medium: { label: "Media",   className: "text-amber-400" },
  low:    { label: "Baja",    className: "text-muted-foreground" },
}

// ── Health bar ────────────────────────────────────────────────────────────────

function HealthBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-red-500"
  const label = score >= 75 ? "Saludable" : score >= 50 ? "Atención" : "Crítico"
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Health score</span>
        <span className={cn("text-sm font-bold tabular-nums",
          score >= 75 ? "text-emerald-500" : score >= 50 ? "text-amber-400" : "text-red-500"
        )}>
          {score}/100 — {label}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

// ── Contact dialog ────────────────────────────────────────────────────────────

const EMPTY_CONTACT = { name: "", email: "", phone: "", role: "", notes: "", is_primary: false }

function ContactDialog({
  open, editing, clientId, onClose, onSaved,
}: {
  open: boolean
  editing: Contact | null
  clientId: string
  onClose: () => void
  onSaved: (c: Contact) => void
}) {
  const [form, setForm] = useState(() =>
    editing ? {
      name:       editing.name,
      email:      editing.email ?? "",
      phone:      editing.phone ?? "",
      role:       editing.role ?? "",
      notes:      editing.notes ?? "",
      is_primary: editing.is_primary,
    } : { ...EMPTY_CONTACT }
  )
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return }
    setSaving(true)
    const sb = createClient() as any

    const payload = {
      client_id:  clientId,
      name:       form.name.trim(),
      email:      form.email.trim() || null,
      phone:      form.phone.trim() || null,
      role:       form.role.trim() || null,
      notes:      form.notes.trim() || null,
      is_primary: form.is_primary,
    }

    let data: any, error: any
    if (editing) {
      const res = await sb.from("contacts").update(payload).eq("id", editing.id).select().single()
      data = res.data; error = res.error
    } else {
      const res = await sb.from("contacts").insert(payload).select().single()
      data = res.data; error = res.error
    }

    setSaving(false)
    if (error) { toast.error(error.message ?? "Error al guardar"); return }
    toast.success(editing ? "Contacto actualizado" : "Contacto agregado")
    onSaved(data)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar contacto" : "Nuevo contacto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} autoFocus required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Input value={form.role} onChange={e => set("role", e.target.value)} placeholder="Founder, CEO, Socio..." />
          </div>
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={e => set("is_primary", e.target.checked)}
              className="accent-brand h-4 w-4"
            />
            <span className="text-sm">Contacto principal</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand/90">
              {saving ? "Guardando…" : editing ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ClientDetail({
  client,
  contacts: initialContacts,
  revenue,
  tasks,
  allClients,
}: {
  client: AnyClient
  contacts: Contact[]
  revenue: RevenueRecord[]
  tasks: Task[]
  allClients: AnyClient[]
}) {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [contactDialog, setContactDialog] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [confirmContact, setConfirmContact] = useState<string | null>(null)

  const statusCfg = STATUS_CFG[client.status] ?? STATUS_CFG.active
  const parentClient = allClients.find((c: AnyClient) => c.id === client.parent_client_id)
  const subClients = allClients.filter((c: AnyClient) => c.parent_client_id === client.id)

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0)
  const pendingTasks = tasks.filter(t => t.status !== "done" && t.status !== "cancelled")

  async function deleteContact(id: string) {
    const sb = createClient() as any
    const { error } = await sb.from("contacts").delete().eq("id", id)
    if (error) { toast.error("No se pudo eliminar"); return }
    setContacts(prev => prev.filter(c => c.id !== id))
    toast.success("Contacto eliminado")
  }

  function handleContactSaved(c: Contact) {
    setContacts(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next }
      return [...prev, c]
    })
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back nav */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Clientes
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 flex-shrink-0">
          <AvatarImage src={client.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg font-bold bg-brand/10 text-brand">
            {getInitials(client.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold font-serif">{client.full_name}</h1>
            {client.status === "at_risk" && (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            )}
          </div>
          {client.company && <p className="text-muted-foreground">{client.company}</p>}
          {client.industry && <p className="text-sm text-muted-foreground/70">{client.industry}</p>}

          <div className="flex flex-wrap gap-2 mt-3">
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border", statusCfg.badge)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
              {statusCfg.label}
            </span>
            {client.tier && (
              <span className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground bg-muted">
                {client.tier}
              </span>
            )}
            {(client.tags ?? []).map((tag: string) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>

          {parentClient && (
            <p className="text-sm text-violet-400 mt-2">
              ↳ Sub-cliente de{" "}
              <Link href={`/clients/${parentClient.id}`} className="underline hover:text-violet-300">
                {parentClient.full_name}
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">MRR</span>
          </div>
          <p className="text-xl font-bold tabular-nums font-mono">
            {client.monthly_fee ? `$${Number(client.monthly_fee).toLocaleString("en-US")}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">/ mes</p>
        </div>
        {client.setup_paid && Number(client.setup_paid) > 0 ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Setup</span>
            </div>
            <p className="text-xl font-bold tabular-nums font-mono">
              ${Number(client.setup_paid).toLocaleString("en-US")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">one-time</p>
          </div>
        ) : null}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Facturado</span>
          </div>
          <p className="text-xl font-bold tabular-nums font-mono">
            ${totalRevenue.toLocaleString("en-US")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">últimos 12 meses</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tareas</span>
          </div>
          <p className="text-xl font-bold tabular-nums font-mono">{pendingTasks.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">pendientes</p>
        </div>
      </div>

      {/* Health score */}
      {client.health_score != null && (
        <div className="rounded-xl border border-border bg-card p-4">
          <HealthBar score={Number(client.health_score)} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Info + Contacts */}
        <div className="space-y-6">
          {/* Client info */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Información de contacto</h2>
            <div className="space-y-2">
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm hover:text-brand transition-colors">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {client.email}
                </a>
              )}
              {client.phone && (
                <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm hover:text-brand transition-colors">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {client.phone}
                </a>
              )}
              {client.instagram_handle && (
                <a
                  href={`https://instagram.com/${client.instagram_handle}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-brand transition-colors"
                >
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  @{client.instagram_handle}
                </a>
              )}
              {client.slack_channel && (
                <a
                  href={`https://slack.com/app_redirect?channel=${client.slack_channel.replace("#","")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-brand transition-colors"
                >
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  {client.slack_channel}
                </a>
              )}
              {client.contract_start && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Desde {format(new Date(client.contract_start), "MMM yyyy", { locale: es })}
                  {client.contract_end && ` → ${format(new Date(client.contract_end), "MMM yyyy", { locale: es })}`}
                </div>
              )}
            </div>

            {client.notes && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1.5">Notas</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {client.notes}
                </p>
              </div>
            )}
          </div>

          {/* Sub-clients */}
          {subClients.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Sub-clientes ({subClients.length})
              </h2>
              <div className="space-y-2">
                {subClients.map((sub: AnyClient) => (
                  <Link
                    key={sub.id}
                    href={`/clients/${sub.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{sub.full_name}</p>
                      {sub.company && <p className="text-xs text-muted-foreground">{sub.company}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Contacts */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Contactos ({contacts.length})</h2>
              <Button
                size="sm" variant="ghost"
                onClick={() => { setEditingContact(null); setContactDialog(true) }}
                className="h-7 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Agregar
              </Button>
            </div>

            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Sin contactos todavía</p>
            ) : (
              <div className="space-y-3">
                {contacts.map(contact => (
                  <div key={contact.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={contact.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-brand/10 text-brand">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{contact.name}</p>
                        {contact.is_primary && (
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        )}
                      </div>
                      {contact.role && <p className="text-xs text-muted-foreground">{contact.role}</p>}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-xs text-brand hover:underline">
                          {contact.email}
                        </a>
                      )}
                      {contact.notes && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{contact.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6"
                        onClick={() => { setEditingContact(contact); setContactDialog(true) }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => setConfirmContact(contact.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Revenue + Tasks */}
        <div className="space-y-6">
          {/* Revenue history */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Revenue (últimos 12 meses)</h2>
            {revenue.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Sin registros de revenue</p>
            ) : (
              <div className="space-y-2">
                {revenue.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm">
                        {format(new Date(r.period_month), "MMMM yyyy", { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{r.category}</p>
                    </div>
                    <span className="text-sm font-bold font-mono tabular-nums text-emerald-400">
                      +${Number(r.amount).toLocaleString("en-US")}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-medium text-muted-foreground">Total</span>
                  <span className="text-base font-bold font-mono tabular-nums">
                    ${totalRevenue.toLocaleString("en-US")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Related tasks */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Tareas relacionadas</h2>
              <Link href="/tasks" className="text-xs text-brand hover:underline">
                Ver todas →
              </Link>
            </div>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Sin tareas relacionadas</p>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 10).map(task => {
                  const prio = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.medium
                  const isDone = task.status === "done" || task.status === "cancelled"
                  return (
                    <div
                      key={task.id}
                      className={cn("flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0",
                        isDone && "opacity-50"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", prio.className.replace("text-", "bg-"))} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-tight", isDone && "line-through")}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn("text-[10px] font-medium", prio.className)}>{prio.label}</span>
                          {task.due_date && (
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(task.due_date), "d MMM", { locale: es })}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground capitalize">{task.status.replace("_", " ")}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ContactDialog
        open={contactDialog}
        editing={editingContact}
        clientId={client.id}
        onClose={() => { setContactDialog(false); setEditingContact(null) }}
        onSaved={handleContactSaved}
      />
      <ConfirmDialog
        open={!!confirmContact}
        onOpenChange={v => !v && setConfirmContact(null)}
        title="¿Eliminar contacto?"
        description="Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmContact) { deleteContact(confirmContact); setConfirmContact(null) } }}
      />
    </div>
  )
}
