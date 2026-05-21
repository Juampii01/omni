"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  ArrowLeft, Phone, Mail, Calendar, DollarSign, Tag,
  MessageSquare, PhoneCall, FileText, GitBranch, Plus,
  CheckSquare, Clock, AlertCircle, Flame, ArrowUp,
} from "lucide-react"
import { cn, getInitials, formatCurrency } from "@/lib/utils"
import {
  LEAD_STAGE_LABELS, LEAD_STAGE_COLORS, LEAD_STAGES,
  TASK_PRIORITY_LABELS,
  type LeadStage, type TaskPriority,
} from "@/lib/constants"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

type Lead = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  source: string | null
  origin_angle: string | null
  stage: LeadStage
  amount: number
  expected_close_date: string | null
  notes: string | null
  tags: string[]
  assigned_to: string | null
  created_at: string
  updated_at: string
}

type Activity = {
  id: string
  type: "note" | "call" | "email" | "meeting" | "stage_change" | "amount_change"
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null
}

type Task = {
  id: string
  title: string
  status: string
  priority: TaskPriority
  due_date: string | null
  assigned_to: string | null
}

type Profile = { id: string; full_name: string | null; avatar_url: string | null }

// ── Activity helpers ──────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<Activity["type"], React.ReactNode> = {
  note:         <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />,
  call:         <PhoneCall className="h-3.5 w-3.5 text-blue-500" />,
  email:        <Mail className="h-3.5 w-3.5 text-purple-500" />,
  meeting:      <Calendar className="h-3.5 w-3.5 text-amber-500" />,
  stage_change: <GitBranch className="h-3.5 w-3.5 text-brand" />,
  amount_change: <DollarSign className="h-3.5 w-3.5 text-green-500" />,
}

const ACTIVITY_LABELS: Record<Activity["type"], string> = {
  note: "Nota", call: "Llamada", email: "Email",
  meeting: "Reunión", stage_change: "Etapa cambiada", amount_change: "Valor actualizado",
}

const PRIORITY_ICONS: Record<TaskPriority, React.ReactNode> = {
  low:    <ArrowUp className="h-3 w-3 rotate-180 text-muted-foreground" />,
  medium: <ArrowUp className="h-3 w-3 text-amber-500" />,
  high:   <AlertCircle className="h-3 w-3 text-orange-500" />,
  urgent: <Flame className="h-3 w-3 text-destructive" />,
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function LeadDetailClient({ lead: initialLead, activities: initialActivities, tasks, profiles }: {
  lead: Lead
  activities: Activity[]
  tasks: Task[]
  profiles: Profile[]
}) {
  const router = useRouter()
  const [lead, setLead] = useState(initialLead)
  const [activities, setActivities] = useState(initialActivities)

  // ── Realtime: listen for updates to THIS lead ──────────────────────────────
  useEffect(() => {
    const sb = createClient()
    const channel = (sb as any)
      .channel(`lead-detail-${initialLead.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads", filter: `id=eq.${initialLead.id}` },
        (payload: any) => {
          if (payload.new?.deleted_at) {
            // Lead was soft-deleted by another user → redirect
            toast("Lead eliminado por otro usuario")
            router.push("/crm")
          } else {
            setLead(prev => ({ ...prev, ...payload.new }))
          }
        }
      )
      .subscribe()

    return () => { (sb as any).removeChannel(channel) }
  }, [initialLead.id, router])
  const [noteText, setNoteText] = useState("")
  const [addingNote, setAddingNote] = useState(false)
  const [newActivityType, setNewActivityType] = useState<Activity["type"]>("note")

  const assignee = profiles.find(p => p.id === lead.assigned_to)

  // ── Change stage ────────────────────────────────────────────────────────────
  async function handleStageChange(stage: LeadStage) {
    if (stage === lead.stage) return
    const prevStage = lead.stage
    setLead(l => ({ ...l, stage }))
    const sb = createClient() as any
    const { error } = await sb.from("leads").update({ stage }).eq("id", lead.id)
    if (error) { toast.error("No se pudo actualizar la etapa"); setLead(l => ({ ...l, stage: prevStage })); return }
    toast.success(`Etapa actualizada a "${LEAD_STAGE_LABELS[stage]}"`)
    // Log activity
    await sb.from("lead_activities").insert({
      lead_id: lead.id,
      user_id: (await sb.auth.getUser()).data.user?.id,
      type: "stage_change",
      description: `Etapa cambiada de "${LEAD_STAGE_LABELS[prevStage]}" a "${LEAD_STAGE_LABELS[stage]}"`,
    })
  }

  // ── Add activity ────────────────────────────────────────────────────────────
  async function handleAddNote() {
    if (!noteText.trim()) return
    setAddingNote(true)
    const sb = createClient() as any
    const { data: { user } } = await sb.auth.getUser()
    const { data, error } = await sb.from("lead_activities").insert({
      lead_id: lead.id,
      user_id: user?.id,
      type: newActivityType,
      description: noteText.trim(),
    }).select("*, profiles:user_id(id, full_name, avatar_url)").single()
    setAddingNote(false)
    if (error) { toast.error("No se pudo guardar"); return }
    setActivities(prev => [data as Activity, ...prev])
    setNoteText("")
    toast.success(`${ACTIVITY_LABELS[newActivityType]} registrada`)
  }

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-start gap-4">
        <Link href="/crm">
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold truncate">{lead.full_name}</h1>
            <Badge className={cn("text-xs", LEAD_STAGE_COLORS[lead.stage])}>
              {LEAD_STAGE_LABELS[lead.stage]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Creado {new Date(lead.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: info + stage + activity ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Stage selector */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Etapa del pipeline</p>
              <div className="flex flex-wrap gap-2">
                {LEAD_STAGES.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStageChange(s)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      lead.stage === s
                        ? "border-brand bg-brand text-brand-foreground shadow-sm"
                        : "border-border hover:border-brand/40 hover:bg-muted/50"
                    )}
                  >
                    {LEAD_STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Add activity */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registrar actividad</p>
                <Select value={newActivityType} onValueChange={v => setNewActivityType(v as Activity["type"])}>
                  <SelectTrigger className="h-7 text-xs w-36 ml-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["note", "call", "email", "meeting"] as const).map(t => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {ACTIVITY_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder={
                  newActivityType === "call" ? "¿Cómo fue la llamada? ¿Qué acordaron?" :
                  newActivityType === "email" ? "¿Qué les enviaste?" :
                  newActivityType === "meeting" ? "¿De qué trató la reunión?" :
                  "Agregá una nota sobre este lead…"
                }
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={addingNote || !noteText.trim()}
                  className="bg-brand hover:bg-brand-hover"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {addingNote ? "Guardando…" : `Guardar ${ACTIVITY_LABELS[newActivityType].toLowerCase()}`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity feed */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Actividad</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sin actividad registrada todavía.</p>
              ) : (
                <div className="space-y-0">
                  {activities.map((act, idx) => (
                    <div key={act.id} className="flex gap-3 group">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 ring-2 ring-background">
                          {ACTIVITY_ICONS[act.type]}
                        </div>
                        {idx < activities.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1 mb-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-4 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium">{act.profiles?.full_name ?? "Sistema"}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{ACTIVITY_LABELS[act.type]}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{timeAgo(act.created_at)}</span>
                        </div>
                        {act.description && (
                          <p className="text-sm mt-1 text-foreground/90 leading-snug">{act.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: sidebar ───────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Key info */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Información</p>
              <Separator />

              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(lead.amount)}</span>
                  <span className="text-xs text-muted-foreground">valor potencial</span>
                </div>

                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a href={`mailto:${lead.email}`} className="text-sm hover:text-brand transition-colors truncate">
                      {lead.email}
                    </a>
                  </div>
                )}

                {lead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a href={`tel:${lead.phone}`} className="text-sm hover:text-brand transition-colors">
                      {lead.phone}
                    </a>
                  </div>
                )}

                {lead.source && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm">{lead.source}</span>
                  </div>
                )}

                {lead.expected_close_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                      Cierre esperado:{" "}
                      {new Date(lead.expected_close_date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                )}

                {assignee && (
                  <div className="flex items-center gap-2 pt-1">
                    <Avatar className="h-5 w-5 shrink-0">
                      {assignee.avatar_url && <AvatarImage src={assignee.avatar_url} />}
                      <AvatarFallback className="text-[9px] bg-brand-soft text-brand">
                        {getInitials(assignee.full_name ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">Asignado a</span>
                    <span className="text-sm font-medium">{assignee.full_name}</span>
                  </div>
                )}
              </div>

              {lead.tags && lead.tags.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </>
              )}

              {lead.notes && (
                <>
                  <Separator />
                  <p className="text-xs text-muted-foreground leading-relaxed">{lead.notes}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Related tasks */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                Tareas relacionadas
                {tasks.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs tabular-nums">{tasks.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Sin tareas asociadas.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map(t => {
                    const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
                    return (
                      <div key={t.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                        <span className="mt-0.5">{PRIORITY_ICONS[t.priority]}</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs font-medium leading-snug", t.status === "done" && "line-through text-muted-foreground")}>
                            {t.title}
                          </p>
                          {t.due_date && (
                            <span className={cn("text-[10px]", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                              <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                              {new Date(t.due_date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => router.push("/tasks")}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nueva tarea
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
