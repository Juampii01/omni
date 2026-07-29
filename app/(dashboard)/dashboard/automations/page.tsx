"use client"

import { useEffect, useState } from "react"
import { Plus, Zap, Trash2, ChevronDown, ChevronRight, Copy } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

type Step = { id?: string; step_order?: number; action_type: string; action_config: Record<string, unknown> }
type Workflow = {
  id: string
  name: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  webhook_secret: string | null
  is_active: boolean
  automation_steps: Step[]
}
type Run = { id: string; status: "success" | "error"; log: Array<{ step: number; action_type: string; ok: boolean; detail: string }>; triggered_at: string }

const TRIGGER_LABEL: Record<string, string> = {
  "briefing.finding": "Nuevo hallazgo en un briefing",
  "task.column_changed": "Una tarea cambia de columna",
  "webhook.incoming": "Webhook entrante",
  "schedule.due": "Por horario",
}

const ACTION_LABEL: Record<string, string> = {
  create_task: "Crear tarea",
  send_notification: "Enviar notificación",
  call_webhook: "Llamar webhook",
  ai_digest: "Resumen con IA",
}

const DATA_SOURCE_LABEL: Record<string, string> = {
  leads: "Leads",
  content_calendar: "Calendario de contenido",
  kanban_tasks: "Tareas",
  calendar_events: "Eventos de calendario",
  daily_briefings: "Briefings diarios",
  pulse_checkins: "Pulse check-ins",
}

const WEEKDAY_LABEL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

function RunsList({ workflowId }: { workflowId: string }) {
  const [runs, setRuns] = useState<Run[] | null>(null)

  useEffect(() => {
    fetchWithAuth(`/api/omni/automations/${workflowId}/runs`)
      .then((r) => r.json())
      .then((d) => setRuns(d.items ?? []))
  }, [workflowId])

  if (runs === null) return <p className="text-xs text-muted-foreground">Cargando runs…</p>
  if (runs.length === 0) return <p className="text-xs text-muted-foreground">Todavía no se disparó ninguna vez.</p>

  return (
    <div className="space-y-2">
      {runs.map((r) => (
        <div key={r.id} className="rounded-lg border border-border/50 p-2.5 text-xs">
          <div className="flex items-center justify-between">
            <Badge variant={r.status === "success" ? "default" : "destructive"}>{r.status}</Badge>
            <span className="text-muted-foreground">{new Date(r.triggered_at).toLocaleString("es-AR")}</span>
          </div>
          <div className="mt-1.5 space-y-1">
            {r.log.map((entry, i) => (
              <p key={i} className={entry.ok ? "text-muted-foreground" : "text-destructive"}>
                {ACTION_LABEL[entry.action_type] ?? entry.action_type}: {entry.detail}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function WorkflowCard({ workflow, onToggle, onDelete }: { workflow: Workflow; onToggle: (w: Workflow) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const webhookUrl =
    workflow.trigger_type === "webhook.incoming" && workflow.webhook_secret
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/automation/${workflow.id}?secret=${workflow.webhook_secret}`
      : null

  function copyWebhookUrl() {
    if (!webhookUrl) return
    navigator.clipboard.writeText(webhookUrl)
    toast.success("URL copiada")
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">{workflow.name}</CardTitle>
          <CardDescription>{TRIGGER_LABEL[workflow.trigger_type] ?? workflow.trigger_type}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={workflow.is_active ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onToggle(workflow)}
          >
            {workflow.is_active ? "Activo" : "Pausado"}
          </Badge>
          <button onClick={() => onDelete(workflow.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {workflow.automation_steps
            .slice()
            .sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
            .map((s, i) => (
              <span key={s.id ?? i} className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">
                {i + 1}. {ACTION_LABEL[s.action_type] ?? s.action_type}
              </span>
            ))}
        </div>

        {webhookUrl && (
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs">
            <code className="flex-1 truncate">{webhookUrl}</code>
            <button onClick={copyWebhookUrl} className="shrink-0 text-muted-foreground hover:text-foreground">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Ver ejecuciones
        </button>
        {expanded && <RunsList workflowId={workflow.id} />}
      </CardContent>
    </Card>
  )
}

function NewWorkflowDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [triggerType, setTriggerType] = useState("briefing.finding")
  const [briefingType, setBriefingType] = useState("")
  const [minSeveridad, setMinSeveridad] = useState("")
  const [columnId, setColumnId] = useState("listo")
  const [dayOfWeek, setDayOfWeek] = useState("3")
  const [hour, setHour] = useState("8")
  const [steps, setSteps] = useState<Step[]>([{ action_type: "create_task", action_config: { title: "", description: "" } }])
  const [saving, setSaving] = useState(false)

  function updateStep(i: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }
  function updateStepConfig(i: number, key: string, value: string) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, action_config: { ...s.action_config, [key]: value } } : s)))
  }

  function buildActionConfig(step: Step): Record<string, unknown> {
    if (step.action_type !== "ai_digest") return step.action_config
    const { outputType, outputTitle, lookbackDays, ...rest } = step.action_config
    return {
      ...rest,
      lookbackDays: Number(lookbackDays) || 7,
      ...(outputType === "task"
        ? { createTask: { labelText: "Resumen IA" } }
        : { notify: { title: (outputTitle as string) || undefined } }),
    }
  }

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    const triggerConfig: Record<string, unknown> =
      triggerType === "briefing.finding"
        ? { ...(briefingType ? { briefingType } : {}), ...(minSeveridad ? { minSeveridad } : {}) }
        : triggerType === "task.column_changed"
          ? { columnId }
          : triggerType === "schedule.due"
            ? { dayOfWeek: Number(dayOfWeek), hour: Number(hour) }
            : {}

    const res = await fetchWithAuth("/api/omni/automations", {
      method: "POST",
      body: JSON.stringify({
        name,
        triggerType,
        triggerConfig,
        steps: steps.map((s) => ({ actionType: s.action_type, actionConfig: buildActionConfig(s) })),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo crear el workflow")
      return
    }
    toast.success("Workflow creado")
    setOpen(false)
    setName("")
    setSteps([{ action_type: "create_task", action_config: { title: "", description: "" } }])
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus /> Nuevo workflow</Button>} />
      <DialogContent className="max-h-[85vh] sm:max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo workflow</DialogTitle>
          <DialogDescription>Elegí qué lo dispara y qué hace cuando se dispara.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input placeholder="Nombre del workflow" value={name} onChange={(e) => setName(e.target.value)} />

          <div>
            <label className="text-xs text-muted-foreground">Disparador</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="briefing.finding">Nuevo hallazgo en un briefing</option>
              <option value="task.column_changed">Una tarea cambia de columna</option>
              <option value="webhook.incoming">Webhook entrante</option>
              <option value="schedule.due">Por horario</option>
            </select>
          </div>

          {triggerType === "schedule.due" && (
            <div className="flex gap-3">
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm">
                {WEEKDAY_LABEL.map((label, i) => (
                  <option key={i} value={i}>
                    {label}
                  </option>
                ))}
              </select>
              <select value={hour} onChange={(e) => setHour(e.target.value)} className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm">
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
            </div>
          )}

          {triggerType === "briefing.finding" && (
            <div className="flex gap-3">
              <select value={briefingType} onChange={(e) => setBriefingType(e.target.value)} className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Cualquier tipo</option>
                <option value="leads">Leads</option>
                <option value="prospecting">Prospección</option>
                <option value="unanswered">Sin responder</option>
              </select>
              <select value={minSeveridad} onChange={(e) => setMinSeveridad(e.target.value)} className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Cualquier severidad</option>
                <option value="media">Media o más</option>
                <option value="alta">Solo alta</option>
              </select>
            </div>
          )}

          {triggerType === "task.column_changed" && (
            <select value={columnId} onChange={(e) => setColumnId(e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="por-hacer">Por hacer</option>
              <option value="en-proceso">En proceso</option>
              <option value="en-revision">En revisión</option>
              <option value="listo">Listo</option>
            </select>
          )}

          {triggerType === "webhook.incoming" && (
            <p className="text-xs text-muted-foreground">La URL del webhook (con su secret) se genera al crear el workflow.</p>
          )}

          <div className="space-y-3 border-t border-border/50 pt-4">
            <p className="text-xs font-medium">Acciones (se ejecutan en orden)</p>
            {steps.map((step, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border/50 p-3">
                <select
                  value={step.action_type}
                  onChange={(e) => updateStep(i, { action_type: e.target.value, action_config: {} })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="create_task">Crear tarea</option>
                  <option value="send_notification">Enviar notificación</option>
                  <option value="call_webhook">Llamar webhook</option>
                  <option value="ai_digest">Resumen con IA</option>
                </select>

                {step.action_type === "ai_digest" && (
                  <>
                    <select
                      value={(step.action_config.dataSource as string) ?? ""}
                      onChange={(e) => updateStepConfig(i, "dataSource", e.target.value)}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Elegí una fuente de datos</option>
                      {Object.entries(DATA_SOURCE_LABEL).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      placeholder="Días hacia atrás (default 7)"
                      value={(step.action_config.lookbackDays as string) ?? ""}
                      onChange={(e) => updateStepConfig(i, "lookbackDays", e.target.value)}
                    />
                    <Textarea
                      placeholder="Qué ángulo resumir (ej: enfocate en patrones de bloqueo repetidos)"
                      rows={2}
                      value={(step.action_config.promptInstructions as string) ?? ""}
                      onChange={(e) => updateStepConfig(i, "promptInstructions", e.target.value)}
                    />
                    <div className="flex gap-3">
                      <select
                        value={(step.action_config.outputType as string) ?? "notify"}
                        onChange={(e) => updateStepConfig(i, "outputType", e.target.value)}
                        className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option value="notify">Enviar notificación</option>
                        <option value="task">Crear tarea</option>
                      </select>
                      {((step.action_config.outputType as string) ?? "notify") === "notify" && (
                        <Input
                          placeholder="Título de la notificación"
                          value={(step.action_config.outputTitle as string) ?? ""}
                          onChange={(e) => updateStepConfig(i, "outputTitle", e.target.value)}
                        />
                      )}
                    </div>
                  </>
                )}

                {step.action_type === "create_task" && (
                  <>
                    <Input
                      placeholder="Título (podés usar {{type}}, {{findings.0.titulo}}...)"
                      value={(step.action_config.title as string) ?? ""}
                      onChange={(e) => updateStepConfig(i, "title", e.target.value)}
                    />
                    <Textarea placeholder="Descripción" rows={2} value={(step.action_config.description as string) ?? ""} onChange={(e) => updateStepConfig(i, "description", e.target.value)} />
                  </>
                )}
                {step.action_type === "send_notification" && (
                  <>
                    <Input placeholder="Título" value={(step.action_config.title as string) ?? ""} onChange={(e) => updateStepConfig(i, "title", e.target.value)} />
                    <Textarea placeholder="Cuerpo" rows={2} value={(step.action_config.body as string) ?? ""} onChange={(e) => updateStepConfig(i, "body", e.target.value)} />
                  </>
                )}
                {step.action_type === "call_webhook" && (
                  <Input placeholder="https://..." value={(step.action_config.url as string) ?? ""} onChange={(e) => updateStepConfig(i, "url", e.target.value)} />
                )}

                {steps.length > 1 && (
                  <button onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-muted-foreground hover:text-destructive">
                    Quitar step
                  </button>
                )}
              </div>
            ))}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSteps((prev) => [...prev, { action_type: "create_task", action_config: {} }])}
            >
              <Plus className="h-3.5 w-3.5" /> Agregar acción
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? "Creando…" : "Crear workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null)

  async function load() {
    const res = await fetchWithAuth("/api/omni/automations")
    const data = await res.json()
    setWorkflows(data.items ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleToggle(workflow: Workflow) {
    const res = await fetchWithAuth(`/api/omni/automations/${workflow.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !workflow.is_active }) })
    if (!res.ok) {
      toast.error("No se pudo actualizar el workflow")
      return
    }
    setWorkflows((prev) => (prev ?? []).map((w) => (w.id === workflow.id ? { ...w, is_active: !w.is_active } : w)))
  }

  async function handleDelete(id: string) {
    const res = await fetchWithAuth(`/api/omni/automations/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("No se pudo eliminar el workflow")
      return
    }
    setWorkflows((prev) => (prev ?? []).filter((w) => w.id !== id))
    toast.success("Workflow eliminado")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl">Automatizaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">Disparadores y acciones automáticas — el motor corre cada 5 minutos.</p>
        </div>
        <NewWorkflowDialog onCreated={load} />
      </div>

      {workflows === null ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Zap className="h-6 w-6" />
            Todavía no creaste ningún workflow. Empezá con el botón de arriba.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((w) => (
            <WorkflowCard key={w.id} workflow={w} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
