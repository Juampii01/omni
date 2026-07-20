"use client"

import { useEffect, useState } from "react"
import { Plus, Sparkles, Trash2, FileText, AtSign, Video } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { parseLocalDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

type Idea = { id: string; channel: string; title: string; format: string | null; hook: string | null; notes: string | null; status: string }
type Competitor = { id: string; channel: string; name: string | null; handle: string | null; url: string | null; notes: string | null }
type CalendarItem = { id: string; idea_id: string | null; scheduled_date: string; status: string }
type ScriptType = "full_script" | "hook" | "story_beats"
type Script =
  | {
      id: string
      idea_id: string
      script_type: "full_script"
      script: { hook: string; body: string; cta: string; visual_notes: string; timing: { hook: string; body: string; cta: string } }
    }
  | { id: string; idea_id: string; script_type: "hook"; script: { hooks: string[] } }
  | { id: string; idea_id: string; script_type: "story_beats"; script: { beats: Array<{ content: string; visual_note: string }> } }

function ChannelIcon({ channel }: { channel: string }) {
  return channel === "youtube" ? <Video className="h-3.5 w-3.5" /> : <AtSign className="h-3.5 w-3.5" />
}

/** Editable inline con autoguardado al perder foco — mismo patrón que ya
 *  usa la página de Mentor, sin botón de "Guardar" explícito. Solo llama
 *  a onSave si el valor realmente cambió. */
function EditableField({
  value,
  onSave,
  multiline,
  className,
}: {
  value: string
  onSave: (value: string) => void
  multiline?: boolean
  className?: string
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  function handleBlur() {
    if (draft !== value) onSave(draft)
  }

  return multiline ? (
    <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={handleBlur} rows={2} className={className} />
  ) : (
    <Input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={handleBlur} className={className} />
  )
}

function IdeaCard({
  idea,
  onDelete,
  onGenerateScript,
  onUpdateScript,
  scripts,
}: {
  idea: Idea
  onDelete: (id: string) => void
  onGenerateScript: (idea: Idea, scriptType: ScriptType) => void
  onUpdateScript: (scriptId: string, newContent: Script["script"]) => void
  scripts: Script[]
}) {
  const ideaScripts = scripts.filter((s) => s.idea_id === idea.id)
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ChannelIcon channel={idea.channel} /> {idea.format}
          </div>
          <CardTitle className="text-sm">{idea.title}</CardTitle>
        </div>
        <button onClick={() => onDelete(idea.id)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      <CardContent className="space-y-2">
        {idea.hook && <p className="text-xs italic text-muted-foreground">&quot;{idea.hook}&quot;</p>}
        {idea.notes && <p className="text-xs text-muted-foreground">{idea.notes}</p>}
        {ideaScripts.map((s) => (
          <div key={s.id} className="rounded-lg border border-border/50 p-2.5 text-xs">
            {s.script_type === "full_script" && (
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Hook</span> <span className="text-muted-foreground">({s.script.timing?.hook ?? "?"})</span>
                  <EditableField multiline value={s.script.hook ?? ""} onSave={(v) => onUpdateScript(s.id, { ...s.script, hook: v })} />
                </div>
                <div>
                  <span className="font-medium">Cuerpo</span> <span className="text-muted-foreground">({s.script.timing?.body ?? "?"})</span>
                  <EditableField multiline value={s.script.body ?? ""} onSave={(v) => onUpdateScript(s.id, { ...s.script, body: v })} />
                </div>
                <div>
                  <span className="font-medium">CTA</span> <span className="text-muted-foreground">({s.script.timing?.cta ?? "?"})</span>
                  <EditableField multiline value={s.script.cta ?? ""} onSave={(v) => onUpdateScript(s.id, { ...s.script, cta: v })} />
                </div>
                <div className="border-t border-border/40 pt-2">
                  <span className="font-medium">Notas visuales</span>
                  <EditableField
                    multiline
                    className="text-muted-foreground"
                    value={s.script.visual_notes ?? ""}
                    onSave={(v) => onUpdateScript(s.id, { ...s.script, visual_notes: v })}
                  />
                </div>
              </div>
            )}
            {s.script_type === "hook" && (
              <div className="space-y-1">
                <p className="font-medium">Variantes de hook</p>
                {(s.script.hooks ?? []).map((h, i) => (
                  <EditableField
                    key={i}
                    value={h}
                    onSave={(v) => {
                      const hooks = [...(s.script.hooks ?? [])]
                      hooks[i] = v
                      onUpdateScript(s.id, { hooks })
                    }}
                  />
                ))}
              </div>
            )}
            {s.script_type === "story_beats" && (
              <div className="space-y-2">
                {(s.script.beats ?? []).map((b, i) => (
                  <div key={i}>
                    <span className="font-medium">Beat {i + 1}</span>
                    <EditableField
                      multiline
                      value={b.content}
                      onSave={(v) => {
                        const beats = (s.script.beats ?? []).map((beat, idx) => (idx === i ? { ...beat, content: v } : beat))
                        onUpdateScript(s.id, { beats })
                      }}
                    />
                    <EditableField
                      multiline
                      className="text-muted-foreground"
                      value={b.visual_note}
                      onSave={(v) => {
                        const beats = (s.script.beats ?? []).map((beat, idx) => (idx === i ? { ...beat, visual_note: v } : beat))
                        onUpdateScript(s.id, { beats })
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" variant="secondary">
                <FileText className="h-3.5 w-3.5" /> Generar guión
              </Button>
            }
          />
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onGenerateScript(idea, "full_script")}>Guion completo</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGenerateScript(idea, "hook")}>Solo hook</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGenerateScript(idea, "story_beats")}>Story beats</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}

export default function ContentPage() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[] | null>(null)
  const [calendar, setCalendar] = useState<CalendarItem[] | null>(null)
  const [scripts, setScripts] = useState<Script[]>([])
  const [genOpen, setGenOpen] = useState(false)
  const [genChannel, setGenChannel] = useState("instagram")
  const [generating, setGenerating] = useState(false)
  const [compDialogOpen, setCompDialogOpen] = useState(false)
  const [compName, setCompName] = useState("")
  const [compHandle, setCompHandle] = useState("")

  async function loadIdeas() {
    const res = await fetchWithAuth("/api/omni/content/ideas")
    const data = await res.json()
    setIdeas(data.items ?? [])
  }
  async function loadCompetitors() {
    const res = await fetchWithAuth("/api/omni/content/competitors")
    const data = await res.json()
    setCompetitors(data.items ?? [])
  }
  async function loadCalendar() {
    const res = await fetchWithAuth("/api/omni/content/calendar")
    const data = await res.json()
    setCalendar(data.items ?? [])
  }
  async function loadScripts() {
    const res = await fetchWithAuth("/api/omni/content/scripts")
    const data = await res.json()
    setScripts(data.items ?? [])
  }

  useEffect(() => {
    loadIdeas()
    loadCompetitors()
    loadCalendar()
    loadScripts()
  }, [])

  async function handleGenerateIdeas() {
    setGenerating(true)
    const res = await fetchWithAuth("/api/omni/content/ideas/generate", { method: "POST", body: JSON.stringify({ channel: genChannel }) })
    const data = await res.json()
    setGenerating(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo generar")
      return
    }
    setIdeas((prev) => [...(data.items ?? []), ...(prev ?? [])])
    setGenOpen(false)
    toast.success("5 ideas generadas")
  }

  async function handleGenerateScript(idea: Idea, scriptType: ScriptType) {
    toast.loading("Generando guión…", { id: "script-gen" })
    const res = await fetchWithAuth("/api/omni/content/scripts/generate", { method: "POST", body: JSON.stringify({ ideaId: idea.id, scriptType }) })
    const data = await res.json()
    toast.dismiss("script-gen")
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo generar el guión")
      return
    }
    setScripts((prev) => [...prev, data.script])
    toast.success("Guión generado")
  }

  async function handleUpdateScript(scriptId: string, newContent: Script["script"]) {
    const res = await fetchWithAuth(`/api/omni/content/scripts/${scriptId}`, { method: "PATCH", body: JSON.stringify({ script: newContent }) })
    if (!res.ok) {
      toast.error("No se pudo guardar el cambio")
      return
    }
    setScripts((prev) => prev.map((sc) => (sc.id === scriptId ? ({ ...sc, script: newContent } as Script) : sc)))
  }

  async function handleDeleteIdea(id: string) {
    await fetchWithAuth(`/api/omni/content/ideas/${id}`, { method: "DELETE" })
    setIdeas((prev) => (prev ?? []).filter((i) => i.id !== id))
  }

  async function handleAddCompetitor() {
    const res = await fetchWithAuth("/api/omni/content/competitors", { method: "POST", body: JSON.stringify({ channel: "instagram", name: compName, handle: compHandle }) })
    const data = await res.json()
    if (data.item) setCompetitors((prev) => [data.item, ...(prev ?? [])])
    setCompDialogOpen(false)
    setCompName("")
    setCompHandle("")
  }

  async function handleDeleteCompetitor(id: string) {
    await fetchWithAuth(`/api/omni/content/competitors/${id}`, { method: "DELETE" })
    setCompetitors((prev) => (prev ?? []).filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Contenido</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ideas, competidores y calendario, todo alimentado por el cerebro de Omni.</p>
      </div>

      <Tabs defaultValue="ideas">
        <TabsList>
          <TabsTrigger value="ideas">Ideas</TabsTrigger>
          <TabsTrigger value="competitors">Competidores</TabsTrigger>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
        </TabsList>

        <TabsContent value="ideas" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={genOpen} onOpenChange={setGenOpen}>
              <DialogTrigger render={<Button><Sparkles /> Generar ideas</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generar ideas de contenido</DialogTitle>
                  <DialogDescription>Omni usa el Context Room y el Mentor para personalizar 5 ideas.</DialogDescription>
                </DialogHeader>
                <select value={genChannel} onChange={(e) => setGenChannel(e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                </select>
                <DialogFooter>
                  <Button onClick={handleGenerateIdeas} disabled={generating}>
                    {generating ? "Generando…" : "Generar 5 ideas"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {ideas === null ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : ideas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay ideas. Generá las primeras con IA.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ideas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onDelete={handleDeleteIdea}
                  onGenerateScript={handleGenerateScript}
                  onUpdateScript={handleUpdateScript}
                  scripts={scripts}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={compDialogOpen} onOpenChange={setCompDialogOpen}>
              <DialogTrigger render={<Button size="sm"><Plus /> Agregar competidor</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo competidor</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Nombre" value={compName} onChange={(e) => setCompName(e.target.value)} />
                  <Input placeholder="@handle" value={compHandle} onChange={(e) => setCompHandle(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button onClick={handleAddCompetitor} disabled={!compName.trim()}>Agregar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {competitors === null ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : competitors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin competidores cargados.</p>
          ) : (
            <div className="space-y-2">
              {competitors.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <ChannelIcon channel={c.channel} /> {c.name} <span className="text-muted-foreground">{c.handle}</span>
                  </div>
                  <button onClick={() => handleDeleteCompetitor(c.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          {calendar === null ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : calendar.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin publicaciones planificadas. Programá una idea desde la pestaña Ideas.</p>
          ) : (
            <div className="space-y-2">
              {calendar
                .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
                .map((c) => {
                  const idea = ideas?.find((i) => i.id === c.idea_id)
                  return (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm">
                      <span>{idea?.title ?? "(idea eliminada)"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{parseLocalDate(c.scheduled_date).toLocaleDateString("es-AR")}</span>
                        <Badge variant="secondary">{c.status}</Badge>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
