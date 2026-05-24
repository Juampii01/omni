"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import {
  Users, Plus, MoreHorizontal, Pencil, Trash2, Search,
  ExternalLink, Instagram, ChevronRight, AlertTriangle, Hash,
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type ClientStatus =
  | "active" | "paused" | "churned" | "completed"
  | "internal_paused" | "prospect" | "at_risk"

type ClientTier = "standard" | "premium" | "vip"

export type Client = {
  id: string
  full_name: string
  email?: string
  phone?: string
  company?: string
  industry?: string
  instagram_handle?: string
  avatar_url?: string
  status: ClientStatus
  tier: ClientTier
  monthly_fee?: number
  setup_paid?: number
  currency: string
  contract_start?: string
  contract_end?: string
  next_renewal?: string
  owner_id?: string
  notes?: string
  tags: string[]
  health_score?: number
  slack_channel?: string
  parent_client_id?: string
  created_at: string
  updated_at: string
}

type Profile = { id: string; full_name: string | null; avatar_url: string | null }

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ClientStatus, { label: string; dot: string; badge: string }> = {
  active:          { label: "Activo",          dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  prospect:        { label: "Prospecto",        dot: "bg-blue-400",    badge: "bg-blue-400/10 text-blue-400 border-blue-400/30" },
  at_risk:         { label: "En riesgo",        dot: "bg-orange-500",  badge: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
  paused:          { label: "Pausado",          dot: "bg-amber-400",   badge: "bg-amber-400/10 text-amber-400 border-amber-400/30" },
  internal_paused: { label: "Pausado interno",  dot: "bg-violet-400",  badge: "bg-violet-400/10 text-violet-400 border-violet-400/30" },
  churned:         { label: "Churn",            dot: "bg-red-500",     badge: "bg-red-500/10 text-red-500 border-red-500/30" },
  completed:       { label: "Completado",       dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border" },
}

const TIER_CFG: Record<ClientTier, { label: string; badge: string }> = {
  standard: { label: "Standard", badge: "bg-card border-border text-muted-foreground" },
  premium:  { label: "Premium",  badge: "bg-brand/10 border-brand/30 text-brand" },
  vip:      { label: "VIP",      badge: "bg-amber-400/10 border-amber-400/30 text-amber-400" },
}

// ── Health score bar ──────────────────────────────────────────────────────────

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-emerald-500" :
    score >= 50 ? "bg-amber-400" :
    "bg-red-500"
  const label =
    score >= 75 ? "Saludable" :
    score >= 50 ? "Atención" :
    "Crítico"
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Health</span>
        <span className={cn("text-[10px] font-bold tabular-nums",
          score >= 75 ? "text-emerald-500" : score >= 50 ? "text-amber-400" : "text-red-500"
        )}>
          {score} <span className="font-normal opacity-70">— {label}</span>
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ clients }: { clients: Client[] }) {
  const active  = clients.filter(c => c.status === "active")
  const mrr     = active.reduce((s, c) => s + (c.monthly_fee ?? 0), 0)
  const atRisk  = clients.filter(c => c.status === "at_risk").length
  const avgHealth = active.length
    ? Math.round(active.reduce((s, c) => s + (c.health_score ?? 80), 0) / active.length)
    : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: "Activos",      value: active.length,                      sub: "clientes" },
        { label: "MRR",          value: `$${mrr.toLocaleString("en-US")}`,  sub: "mensual recurrente" },
        { label: "Health avg",   value: `${avgHealth}%`,                    sub: "clientes activos" },
        { label: "En riesgo",    value: atRisk,                             sub: atRisk === 1 ? "cliente" : "clientes" },
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

// ── Client Form Dialog ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  full_name: "", email: "", phone: "", company: "", industry: "",
  instagram_handle: "",
  status: "active" as ClientStatus, tier: "standard" as ClientTier,
  monthly_fee: "", setup_paid: "", currency: "USD", health_score: "80",
  slack_channel: "",
  contract_start: "", contract_end: "", next_renewal: "",
  notes: "", tags: "",
}

function ClientDialog({
  open, editing, onClose, onSaved,
}: {
  open: boolean
  editing: Client | null
  onClose: () => void
  onSaved: (c: Client) => void
}) {
  const [form, setForm] = useState(() =>
    editing ? {
      full_name:        editing.full_name,
      email:            editing.email ?? "",
      phone:            editing.phone ?? "",
      company:          editing.company ?? "",
      industry:         editing.industry ?? "",
      instagram_handle: editing.instagram_handle ?? "",
      status:           editing.status,
      tier:             editing.tier,
      monthly_fee:      editing.monthly_fee?.toString() ?? "",
      setup_paid:       editing.setup_paid?.toString() ?? "",
      currency:         editing.currency,
      health_score:     (editing.health_score ?? 80).toString(),
      slack_channel:    editing.slack_channel ?? "",
      contract_start:   editing.contract_start ?? "",
      contract_end:     editing.contract_end ?? "",
      next_renewal:     editing.next_renewal ?? "",
      notes:            editing.notes ?? "",
      tags:             (editing.tags ?? []).join(", "),
    } : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error("El nombre es obligatorio"); return }
    setSaving(true)
    const sb = createClient() as any

    const payload = {
      full_name:        form.full_name.trim(),
      email:            form.email.trim() || null,
      phone:            form.phone.trim() || null,
      company:          form.company.trim() || null,
      industry:         form.industry.trim() || null,
      instagram_handle: form.instagram_handle.replace("@", "").trim() || null,
      status:           form.status,
      tier:             form.tier,
      monthly_fee:      form.monthly_fee ? parseFloat(form.monthly_fee) : null,
      setup_paid:       form.setup_paid ? parseFloat(form.setup_paid) : null,
      currency:         form.currency,
      health_score:     form.health_score ? parseInt(form.health_score) : 80,
      slack_channel:    form.slack_channel.trim() || null,
      contract_start:   form.contract_start || null,
      contract_end:     form.contract_end || null,
      next_renewal:     form.next_renewal || null,
      notes:            form.notes.trim() || null,
      tags:             form.tags.split(",").map(t => t.trim()).filter(Boolean),
      updated_at:       new Date().toISOString(),
    }

    let data: any, error: any
    if (editing) {
      const res = await sb.from("clients").update(payload).eq("id", editing.id).select().single()
      data = res.data; error = res.error
    } else {
      const res = await sb.from("clients").insert(payload).select().single()
      data = res.data; error = res.error
    }

    setSaving(false)
    if (error) { toast.error(error.message ?? "Error al guardar"); return }
    toast.success(editing ? "Cliente actualizado" : "Cliente agregado")
    onSaved(data as Client)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
        </DialogHeader>
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
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+54 9 11..." />
            </div>
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Input value={form.company} onChange={e => set("company", e.target.value)} placeholder="ACME S.A." />
            </div>
            <div className="space-y-1.5">
              <Label>Industria</Label>
              <Input value={form.industry} onChange={e => set("industry", e.target.value)} placeholder="Coaching / SaaS" />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input value={form.instagram_handle} onChange={e => set("instagram_handle", e.target.value)} placeholder="@usuario" />
            </div>
            <div className="space-y-1.5">
              <Label>Canal Slack</Label>
              <Input value={form.slack_channel} onChange={e => set("slack_channel", e.target.value)} placeholder="#nombre-canal" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_CFG) as ClientStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_CFG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tier</Label>
              <Select value={form.tier} onValueChange={v => set("tier", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIER_CFG) as ClientTier[]).map(t => (
                    <SelectItem key={t} value={t}>{TIER_CFG[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fee mensual</Label>
              <Input type="number" min="0" step="0.01" value={form.monthly_fee} onChange={e => set("monthly_fee", e.target.value)} placeholder="2500" />
            </div>
            <div className="space-y-1.5">
              <Label>Setup pagado (one-time)</Label>
              <Input type="number" min="0" step="0.01" value={form.setup_paid} onChange={e => set("setup_paid", e.target.value)} placeholder="4000" />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={v => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Health score (0-100)</Label>
              <Input type="number" min="0" max="100" value={form.health_score} onChange={e => set("health_score", e.target.value)} placeholder="80" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Inicio contrato</Label>
              <Input type="date" value={form.contract_start} onChange={e => set("contract_start", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fin contrato</Label>
              <Input type="date" value={form.contract_end} onChange={e => set("contract_end", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Próxima renovación</Label>
              <Input type="date" value={form.next_renewal} onChange={e => set("next_renewal", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <Input value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="coaching, retainer, high-ticket (separados por coma)" />
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Contexto, objetivos, particularidades..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand/90">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Agregar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ClientsClient({
  initialClients,
  profiles,
}: {
  initialClients: Client[]
  profiles: Profile[]
}) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterTier, setFilterTier] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Build lookup: id → full_name for parent-client display
  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false
      if (filterTier !== "all" && c.tier !== filterTier) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          c.full_name.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          (c.industry ?? "").toLowerCase().includes(q) ||
          (c.instagram_handle ?? "").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [clients, search, filterStatus, filterTier])

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(c: Client, e: React.MouseEvent) { e.stopPropagation(); setEditing(c); setDialogOpen(true) }
  function requestDelete(id: string, e: React.MouseEvent) { e.stopPropagation(); setDeleteTarget(id); setConfirmOpen(true) }

  async function handleDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setConfirmOpen(false); setDeleteTarget(null)
    const sb = createClient() as any
    const { error } = await sb.from("clients").delete().eq("id", id)
    if (error) { toast.error("No se pudo eliminar"); return }
    setClients(prev => prev.filter(c => c.id !== id))
    toast.success("Cliente eliminado")
  }

  function handleSaved(c: Client) {
    setClients(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next }
      return [c, ...prev]
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" description={`${clients.length} clientes en la base de datos`} icon={Users}>
        <Button onClick={openCreate} className="bg-brand hover:bg-brand/90">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo cliente
        </Button>
      </PageHeader>

      <SummaryCards clients={clients} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="pl-8 h-8 text-xs w-48"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.keys(STATUS_CFG) as ClientStatus[]).map(s => (
              <SelectItem key={s} value={s}>{STATUS_CFG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tiers</SelectItem>
            {(Object.keys(TIER_CFG) as ClientTier[]).map(t => (
              <SelectItem key={t} value={t}>{TIER_CFG[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center mb-4">
              <Users className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm font-medium">
              {clients.length === 0 ? "Sin clientes todavía" : "Sin resultados"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {clients.length === 0 ? "Agregá tu primer cliente para comenzar." : "Probá cambiando los filtros."}
            </p>
            {clients.length === 0 && (
              <Button onClick={openCreate} className="mt-4 bg-brand hover:bg-brand/90">
                <Plus className="h-4 w-4 mr-2" />
                Agregar cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(client => {
            const statusCfg = STATUS_CFG[client.status] ?? STATUS_CFG.active
            const tierCfg   = TIER_CFG[client.tier] ?? TIER_CFG.standard
            const parentName = client.parent_client_id ? clientById[client.parent_client_id]?.full_name : null
            const hasHealth = client.health_score != null
            const isAtRisk  = client.status === "at_risk" || (hasHealth && client.health_score! < 50)

            return (
              <div
                key={client.id}
                onClick={() => router.push(`/clients/${client.id}`)}
                className={cn(
                  "rounded-xl border bg-card p-4 flex flex-col gap-3 cursor-pointer transition-colors",
                  "hover:border-brand/30 hover:bg-card/80",
                  isAtRisk ? "border-orange-500/30" : "border-border"
                )}
              >
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={client.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs font-bold bg-brand/10 text-brand">
                      {getInitials(client.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm leading-tight truncate">{client.full_name}</p>
                      {isAtRisk && <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />}
                    </div>
                    {client.company && (
                      <p className="text-xs text-muted-foreground truncate">{client.company}</p>
                    )}
                    {client.industry && (
                      <p className="text-xs text-muted-foreground/70 truncate">{client.industry}</p>
                    )}
                    {parentName && (
                      <p className="text-[10px] text-violet-400 mt-0.5">↳ sub-cliente de {parentName}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 -mr-1 -mt-1 flex-shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>
                        <ChevronRight className="h-4 w-4 mr-2" />Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={e => openEdit(client, e)}>
                        <Pencil className="h-4 w-4 mr-2" />Editar
                      </DropdownMenuItem>
                      {client.email && (
                        <DropdownMenuItem asChild onClick={e => e.stopPropagation()}>
                          <a href={`mailto:${client.email}`}>
                            <ExternalLink className="h-4 w-4 mr-2" />Email
                          </a>
                        </DropdownMenuItem>
                      )}
                      {client.slack_channel && (
                        <DropdownMenuItem asChild onClick={e => e.stopPropagation()}>
                          <a href={`https://slack.com/app_redirect?channel=${client.slack_channel.replace("#","")}`} target="_blank" rel="noopener noreferrer">
                            <Hash className="h-4 w-4 mr-2" />Slack
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={e => requestDelete(client.id, e)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border", statusCfg.badge)}>
                    <span className={cn("w-1 h-1 rounded-full", statusCfg.dot)} />
                    {statusCfg.label}
                  </span>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", tierCfg.badge)}>
                    {tierCfg.label}
                  </span>
                  {client.instagram_handle && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      <Instagram className="h-2.5 w-2.5" />@{client.instagram_handle}
                    </span>
                  )}
                  {(client.tags ?? []).slice(0, 1).map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Health score */}
                {hasHealth && <HealthBar score={client.health_score!} />}

                {/* Fee row */}
                {(client.monthly_fee != null && client.monthly_fee > 0) || (client.setup_paid != null && client.setup_paid > 0) ? (
                  <div className="flex items-baseline gap-3 pt-1 border-t border-border">
                    {client.monthly_fee != null && client.monthly_fee > 0 && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold tabular-nums font-mono">
                          ${client.monthly_fee.toLocaleString("en-US")}
                        </span>
                        <span className="text-xs text-muted-foreground">/ mes</span>
                      </div>
                    )}
                    {client.setup_paid != null && client.setup_paid > 0 && (
                      <div className="flex items-baseline gap-1 text-muted-foreground">
                        <span className="text-xs font-mono">+${client.setup_paid.toLocaleString("en-US")}</span>
                        <span className="text-[10px]">setup</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <ClientDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar cliente?"
        description="Se eliminarán también las estrategias y registros asociados."
        onConfirm={handleDelete}
      />
    </div>
  )
}
