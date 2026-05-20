"use client"

import { useState, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  Plus, Pencil, Trash2, Copy, Eye, ChevronLeft, ClipboardList,
  GripVertical, ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
  Star, AlignLeft, AlignJustify, ListChecks,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────
type QuestionType = "text" | "textarea" | "choice" | "rating"

type Question = {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  required: boolean
}

type DiscoveryForm = {
  id: string
  title: string
  description: string | null
  questions: Question[]
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  response_count: number
}

type DiscoveryResponse = {
  id: string
  form_id: string
  respondent_email: string | null
  respondent_name: string | null
  answers: Record<string, string>
  completed_at: string | null
  created_at: string
}

type FormPayload = {
  title: string
  description: string
  is_active: boolean
  questions: Question[]
}

type QuestionDraft = {
  question: string
  type: QuestionType
  options: string
  required: boolean
}

const EMPTY_FORM: FormPayload = {
  title: "",
  description: "",
  is_active: true,
  questions: [],
}

const EMPTY_QUESTION: QuestionDraft = {
  question: "",
  type: "text",
  options: "",
  required: false,
}

const TYPE_LABELS: Record<QuestionType, string> = {
  text: "Texto corto",
  textarea: "Texto largo",
  choice: "Opción múltiple",
  rating: "Calificación 1-5",
}

const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  text: <AlignLeft className="h-3 w-3" />,
  textarea: <AlignJustify className="h-3 w-3" />,
  choice: <ListChecks className="h-3 w-3" />,
  rating: <Star className="h-3 w-3" />,
}

function generateId() {
  return crypto.randomUUID()
}

// ── Question Draft Mini-Form ───────────────────────────────────────────────────
function QuestionForm({ onAdd, onCancel }: {
  onAdd: (q: Question) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<QuestionDraft>({ ...EMPTY_QUESTION })
  const set = (k: keyof QuestionDraft, v: string | boolean) =>
    setDraft(d => ({ ...d, [k]: v }))

  function handleAdd() {
    if (!draft.question.trim()) {
      toast.error("La pregunta no puede estar vacía")
      return
    }
    const question: Question = {
      id: generateId(),
      type: draft.type,
      question: draft.question.trim(),
      required: draft.required,
    }
    if (draft.type === "choice") {
      const opts = draft.options
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
      if (opts.length < 2) {
        toast.error("Ingresá al menos 2 opciones separadas por coma")
        return
      }
      question.options = opts
    }
    onAdd(question)
    setDraft({ ...EMPTY_QUESTION })
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Nueva pregunta
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">Pregunta *</Label>
        <Input
          value={draft.question}
          onChange={e => set("question", e.target.value)}
          placeholder="¿Cuál es tu desafío principal?"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={draft.type} onValueChange={v => set("type", v as QuestionType)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(TYPE_LABELS) as [QuestionType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end pb-1 gap-2">
          <Checkbox
            id="q-required"
            checked={draft.required}
            onCheckedChange={v => set("required", !!v)}
          />
          <Label htmlFor="q-required" className="text-xs cursor-pointer">Requerida</Label>
        </div>
      </div>

      {draft.type === "choice" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Opciones (separadas por coma)</Label>
          <Input
            value={draft.options}
            onChange={e => set("options", e.target.value)}
            placeholder="Opción A, Opción B, Opción C"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleAdd}>
          Agregar pregunta
        </Button>
      </div>
    </div>
  )
}

// ── Question Item ──────────────────────────────────────────────────────────────
function QuestionItem({ question, onDelete }: {
  question: Question
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-start gap-2 border border-border rounded-lg px-3 py-2.5 bg-background group">
      <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm leading-snug truncate">{question.question}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
            {TYPE_ICONS[question.type]}
            {TYPE_LABELS[question.type]}
          </Badge>
          {question.required && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">
              Requerida
            </Badge>
          )}
          {question.options && (
            <span className="text-[10px] text-muted-foreground">
              {question.options.length} opciones
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(question.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── Form Dialog (Create / Edit) ────────────────────────────────────────────────
function FormDialog({ open, editing, currentUserId, onClose, onSaved }: {
  open: boolean
  editing: DiscoveryForm | null
  currentUserId: string
  onClose: () => void
  onSaved: (form: DiscoveryForm & { response_count: number }) => void
}) {
  const [form, setForm] = useState<FormPayload>(() =>
    editing
      ? {
          title: editing.title,
          description: editing.description ?? "",
          is_active: editing.is_active,
          questions: editing.questions ?? [],
        }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [addingQuestion, setAddingQuestion] = useState(false)

  const set = <K extends keyof FormPayload>(k: K, v: FormPayload[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  function handleAddQuestion(q: Question) {
    setForm(f => ({ ...f, questions: [...f.questions, q] }))
    setAddingQuestion(false)
  }

  function handleDeleteQuestion(id: string) {
    setForm(f => ({ ...f, questions: f.questions.filter(q => q.id !== id) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error("El título es obligatorio")
      return
    }
    setSaving(true)
    const sb = createClient() as any
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      is_active: form.is_active,
      questions: form.questions,
      created_by: currentUserId,
      updated_at: new Date().toISOString(),
    }

    let data: any, error: any
    if (editing) {
      const r = await sb
        .from("discovery_forms")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single()
      data = r.data
      error = r.error
    } else {
      const r = await sb
        .from("discovery_forms")
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single()
      data = r.data
      error = r.error
    }

    setSaving(false)
    if (error) {
      toast.error(error.message ?? "Error al guardar")
      return
    }
    toast.success(editing ? "Formulario actualizado" : "Formulario creado")
    onSaved({ ...data, response_count: editing?.response_count ?? 0 })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar formulario" : "Nuevo formulario"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="Formulario de descubrimiento"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={2}
              placeholder="Descripción breve del formulario…"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Activo</p>
              <p className="text-xs text-muted-foreground">Los formularios activos pueden recibir respuestas</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={v => set("is_active", v)}
            />
          </div>

          {/* Questions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Preguntas ({form.questions.length})</Label>
            </div>

            {form.questions.length === 0 && !addingQuestion && (
              <p className="text-xs text-muted-foreground py-2">
                Todavía no hay preguntas. Agregá la primera abajo.
              </p>
            )}

            {form.questions.map(q => (
              <QuestionItem
                key={q.id}
                question={q}
                onDelete={handleDeleteQuestion}
              />
            ))}

            {addingQuestion ? (
              <QuestionForm
                onAdd={handleAddQuestion}
                onCancel={() => setAddingQuestion(false)}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => setAddingQuestion(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Agregar pregunta
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear formulario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Response Row ───────────────────────────────────────────────────────────────
function ResponseRow({ response, questions }: {
  response: DiscoveryResponse
  questions: Question[]
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {response.respondent_name ?? "Anónimo"}
            </p>
            {response.respondent_email && (
              <p className="text-xs text-muted-foreground truncate">
                {response.respondent_email}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-xs text-muted-foreground">
            {response.completed_at
              ? new Date(response.completed_at).toLocaleDateString("es-AR", {
                  day: "2-digit", month: "short", year: "numeric",
                })
              : new Date(response.created_at).toLocaleDateString("es-AR", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
          </span>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20">
          {questions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin preguntas registradas</p>
          ) : (
            questions.map(q => (
              <div key={q.id} className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">{q.question}</p>
                <p className="text-sm">
                  {response.answers[q.id] != null && response.answers[q.id] !== ""
                    ? String(response.answers[q.id])
                    : <span className="text-muted-foreground italic">Sin respuesta</span>
                  }
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Responses View ─────────────────────────────────────────────────────────────
function ResponsesView({ form, onBack }: {
  form: DiscoveryForm
  onBack: () => void
}) {
  const [responses, setResponses] = useState<DiscoveryResponse[] | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchResponses = useCallback(async () => {
    setLoading(true)
    const sb = createClient() as any
    const { data, error } = await sb
      .from("discovery_responses")
      .select("*")
      .eq("form_id", form.id)
      .order("created_at", { ascending: false })
    setLoading(false)
    if (error) {
      toast.error("Error al cargar las respuestas")
      return
    }
    setResponses((data as DiscoveryResponse[]) ?? [])
  }, [form.id])

  useEffect(() => {
    fetchResponses()
  }, [fetchResponses])

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mt-0.5 -ml-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
      </div>

      <PageHeader
        title={form.title}
        description={`${form.response_count} respuesta${form.response_count !== 1 ? "s" : ""}`}
      />

      {loading ? (
        <Card className="border-border shadow-sm">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Cargando respuestas…
          </CardContent>
        </Card>
      ) : responses && responses.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-4">
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Todavía no hay respuestas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Compartí el enlace del formulario para empezar a recibir respuestas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(responses ?? []).map(r => (
            <ResponseRow
              key={r.id}
              response={r}
              questions={form.questions ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Form Card ──────────────────────────────────────────────────────────────────
function FormCard({ form, onEdit, onDelete, onToggleActive, onViewResponses, onCopyLink }: {
  form: DiscoveryForm
  onEdit: (f: DiscoveryForm) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, active: boolean) => void
  onViewResponses: (f: DiscoveryForm) => void
  onCopyLink: (id: string) => void
}) {
  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <CardTitle className="text-base leading-snug">{form.title}</CardTitle>
            {form.description && (
              <CardDescription className="text-xs line-clamp-2">
                {form.description}
              </CardDescription>
            )}
          </div>
          <Badge
            variant={form.is_active ? "default" : "secondary"}
            className="shrink-0 text-xs"
          >
            {form.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{form.response_count}</span>
            {form.response_count === 1 ? "respuesta" : "respuestas"}
          </span>
          <span>·</span>
          <span>
            {(form.questions ?? []).length} pregunta{(form.questions ?? []).length !== 1 ? "s" : ""}
          </span>
          <span>·</span>
          <span>
            {new Date(form.created_at).toLocaleDateString("es-AR", {
              day: "2-digit", month: "short", year: "numeric",
            })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onViewResponses(form)}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Ver respuestas
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onCopyLink(form.id)}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copiar enlace
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEdit(form)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onToggleActive(form.id, !form.is_active)}
          >
            {form.is_active
              ? <><ToggleRight className="h-3.5 w-3.5 mr-1.5" />Desactivar</>
              : <><ToggleLeft className="h-3.5 w-3.5 mr-1.5" />Activar</>
            }
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(form.id)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function DiscoveryClient({ initialForms, currentUserId }: {
  initialForms: (DiscoveryForm & { response_count: number })[]
  currentUserId: string
}) {
  const [forms, setForms] = useState<DiscoveryForm[]>(initialForms)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DiscoveryForm | null>(null)
  const [viewingForm, setViewingForm] = useState<DiscoveryForm | null>(null)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(f: DiscoveryForm) {
    setEditing(f)
    setDialogOpen(true)
  }

  function handleSaved(form: DiscoveryForm & { response_count: number }) {
    setForms(prev => {
      const idx = prev.findIndex(f => f.id === form.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = form
        return next
      }
      return [form, ...prev]
    })
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este formulario? Esta acción no se puede deshacer.")) return
    const sb = createClient() as any
    const { error } = await sb.from("discovery_forms").delete().eq("id", id)
    if (error) {
      toast.error("No se pudo eliminar el formulario")
      return
    }
    setForms(prev => prev.filter(f => f.id !== id))
    toast.success("Formulario eliminado")
  }

  async function handleToggleActive(id: string, active: boolean) {
    const sb = createClient() as any
    const { error } = await sb
      .from("discovery_forms")
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) {
      toast.error("No se pudo actualizar el formulario")
      return
    }
    setForms(prev =>
      prev.map(f => (f.id === id ? { ...f, is_active: active } : f))
    )
    toast.success(active ? "Formulario activado" : "Formulario desactivado")
  }

  function handleCopyLink(id: string) {
    const url = `${window.location.origin}/discovery/${id}/respond`
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success("Enlace copiado al portapapeles", {
          description: `La página pública de respuesta estará en: /discovery/${id}/respond`,
        })
      })
      .catch(() => {
        toast.error("No se pudo copiar el enlace")
      })
  }

  // ── Responses View ──────────────────────────────────────────────────────────
  if (viewingForm) {
    return (
      <ResponsesView
        form={viewingForm}
        onBack={() => setViewingForm(null)}
      />
    )
  }

  // ── Forms List ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Discovery"
        description="Formularios de descubrimiento para prospects y clientes"
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo formulario
        </Button>
      </PageHeader>

      {forms.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-4">
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Todavía no hay formularios</p>
            <p className="text-xs text-muted-foreground mt-1">
              Creá tu primer formulario de descubrimiento para empezar.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer formulario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          "grid gap-4",
          forms.length === 1 ? "grid-cols-1 max-w-lg" : "grid-cols-1 md:grid-cols-2"
        )}>
          {forms.map(form => (
            <FormCard
              key={form.id}
              form={form}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onViewResponses={setViewingForm}
              onCopyLink={handleCopyLink}
            />
          ))}
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        editing={editing}
        currentUserId={currentUserId}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
