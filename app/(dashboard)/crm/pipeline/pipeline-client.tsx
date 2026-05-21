"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, List, GripVertical } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { LEAD_STAGE_LABELS, LEAD_STAGE_COLORS, type LeadStage, LEAD_STAGES } from "@/lib/constants"
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
  notes: string | null
}

type Profile = { id: string; full_name: string | null }

const SOURCES = ["Instagram", "Facebook Ads", "Google Ads", "Referido", "Web", "LinkedIn", "WhatsApp", "Otro"]

// ── Quick lead form ───────────────────────────────────────────────────────────

function QuickLeadDialog({
  open,
  defaultStage,
  profiles,
  onClose,
  onCreated,
}: {
  open: boolean
  defaultStage: LeadStage
  profiles: Profile[]
  onClose: () => void
  onCreated: (lead: Lead) => void
}) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [source, setSource] = useState("")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [assignedTo, setAssignedTo] = useState("none")
  const [saving, setSaving] = useState(false)

  function reset() {
    setFullName(""); setEmail(""); setPhone("")
    setSource(""); setAmount(""); setNotes(""); setAssignedTo("none")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { toast.error("El nombre es obligatorio"); return }
    setSaving(true)
    const sb = createClient() as any
    const { data, error } = await sb.from("leads").insert({
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      source: source || null,
      stage: defaultStage,
      amount: amount ? Number(amount) : 0,
      notes: notes.trim() || null,
      assigned_to: assignedTo === "none" ? null : assignedTo,
    }).select().single()
    setSaving(false)
    if (error) { toast.error("No se pudo crear el lead"); return }
    toast.success("Lead creado")
    onCreated(data as Lead)
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Nuevo lead ·{" "}
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-normal", LEAD_STAGE_COLORS[defaultStage])}>
              {LEAD_STAGE_LABELS[defaultStage]}
            </span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre completo" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@…" />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+54 9 11…" />
            </div>
            <div className="space-y-1.5">
              <Label>Origen</Label>
              <Input list="quick-sources" value={source} onChange={e => setSource(e.target.value)} placeholder="Instagram…" />
              <datalist id="quick-sources">{SOURCES.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="space-y-1.5">
              <Label>Valor ($)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
          {profiles.length > 0 && (
            <div className="space-y-1.5">
              <Label>Asignado a</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Contexto rápido…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-hover">
              {saving ? "Creando…" : "Crear lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Lead card ─────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "bg-background border border-border rounded-md p-2.5 cursor-grab active:cursor-grabbing",
        "shadow-sm hover:shadow-md hover:border-brand/30 transition-all select-none",
        isDragging && "opacity-30 scale-95"
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate leading-tight">{lead.full_name}</p>
          {lead.email && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{lead.email}</p>
          )}
          {lead.amount > 0 && (
            <p className="text-[11px] font-semibold text-brand mt-1.5 tabular-nums">
              {formatCurrency(lead.amount, "USD")}
            </p>
          )}
          {lead.source && (
            <span className="mt-1.5 inline-block text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm">
              {lead.source}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  draggingId,
  profiles,
  onDragStart,
  onDragEnd,
  onDrop,
  onLeadCreated,
}: {
  stage: LeadStage
  leads: Lead[]
  draggingId: string | null
  profiles: Profile[]
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDrop: (stage: LeadStage) => void
  onLeadCreated: (lead: Lead) => void
}) {
  const [isOver, setIsOver] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)

  const stageValue = leads.reduce((s, l) => s + (l.amount ?? 0), 0)

  return (
    <>
      <div
        className={cn(
          "flex-shrink-0 w-52 flex flex-col rounded-lg border transition-colors",
          "bg-muted/20",
          isOver && draggingId
            ? "border-brand/60 bg-brand-soft shadow-[0_0_0_2px_hsl(var(--brand)/0.15)]"
            : "border-border"
        )}
        onDragOver={e => { e.preventDefault(); setIsOver(true) }}
        onDragLeave={() => setIsOver(false)}
        onDrop={() => { setIsOver(false); onDrop(stage) }}
      >
        {/* Column header */}
        <div className="p-2.5 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between gap-1">
            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full truncate", LEAD_STAGE_COLORS[stage])}>
              {LEAD_STAGE_LABELS[stage]}
            </span>
            <span className="text-xs font-semibold text-muted-foreground tabular-nums flex-shrink-0">
              {leads.length}
            </span>
          </div>
          {stageValue > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1 tabular-nums font-medium">
              {formatCurrency(stageValue, "USD")}
            </p>
          )}
        </div>

        {/* Cards */}
        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 260px)" }}>
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isDragging={draggingId === lead.id}
              onDragStart={() => onDragStart(lead.id)}
              onDragEnd={onDragEnd}
            />
          ))}
          {leads.length === 0 && !isOver && (
            <div className="flex items-center justify-center py-8">
              <p className="text-[11px] text-muted-foreground">Sin leads</p>
            </div>
          )}
          {isOver && draggingId && (
            <div className="h-14 rounded-md border-2 border-dashed border-brand/40 bg-brand-soft/50" />
          )}
        </div>

        {/* Add button */}
        <div className="p-2 border-t border-border flex-shrink-0">
          <button
            onClick={() => setQuickOpen(true)}
            className="w-full flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1 px-1.5 rounded hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar lead
          </button>
        </div>
      </div>

      <QuickLeadDialog
        open={quickOpen}
        defaultStage={stage}
        profiles={profiles}
        onClose={() => setQuickOpen(false)}
        onCreated={onLeadCreated}
      />
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function PipelineClient({
  initialLeads,
  profiles,
}: {
  initialLeads: Lead[]
  profiles: Profile[]
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const totalValue = leads.reduce((s, l) => s + (l.amount ?? 0), 0)

  function getLeadsByStage(stage: LeadStage) {
    return leads.filter(l => l.stage === stage)
  }

  function handleDragStart(id: string) {
    setDraggingId(id)
  }

  function handleDragEnd() {
    setDraggingId(null)
  }

  async function handleDrop(targetStage: LeadStage) {
    if (!draggingId) return
    const lead = leads.find(l => l.id === draggingId)
    if (!lead || lead.stage === targetStage) {
      setDraggingId(null)
      return
    }

    const previousStage = lead.stage

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === draggingId ? { ...l, stage: targetStage } : l))
    setDraggingId(null)

    const supabase = createClient() as any
    const { error } = await supabase.from("leads").update({ stage: targetStage }).eq("id", draggingId)
    if (error) {
      toast.error("No se pudo mover el lead")
      // Revert
      setLeads(prev => prev.map(l => l.id === draggingId ? { ...l, stage: previousStage } : l))
    }
  }

  function handleLeadCreated(lead: Lead) {
    setLeads(prev => [lead, ...prev])
  }

  const activeLeads = leads.filter(l => l.stage !== "lost")
  const activeValue = activeLeads.reduce((s, l) => s + (l.amount ?? 0), 0)

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-shrink-0">
        <PageHeader
          title="Pipeline"
          description={`${leads.length} leads · ${formatCurrency(activeValue, "USD")} activo`}
        />
        <Link href="/crm">
          <Button variant="outline" size="sm">
            <List className="h-4 w-4 mr-2" />
            Vista lista
          </Button>
        </Link>
      </div>

      {/* Kanban board — horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-3 flex-1" style={{ cursor: draggingId ? "grabbing" : undefined }}>
        {LEAD_STAGES.map(stage => (
          <KanbanColumn
            key={stage}
            stage={stage}
            leads={getLeadsByStage(stage)}
            draggingId={draggingId}
            profiles={profiles}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onLeadCreated={handleLeadCreated}
          />
        ))}
      </div>
    </div>
  )
}
