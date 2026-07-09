"use client"

import { useEffect, useState } from "react"
import { Plus, Sparkles, Clock, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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

type Step = { order: number; label: string; description?: string }
type Template = { channel: string; label: string; body: string }
type Sop = {
  id: string
  title: string
  frequency: string | null
  tags: string[]
  steps: Step[]
  templates: Template[]
  ai_generated: boolean
}

function SopCard({ sop, onDelete }: { sop: Sop; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <CardHeader className="cursor-pointer flex-row items-center justify-between" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <div>
            <p className="text-sm font-medium">{sop.title}</p>
            <div className="mt-1 flex items-center gap-2">
              {sop.frequency && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {sop.frequency}
                </span>
              )}
              {sop.ai_generated && <Badge variant="secondary" className="text-[10px]">IA</Badge>}
              {sop.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(sop.id) }} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          {sop.steps.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pasos</p>
              <ol className="space-y-1.5">
                {sop.steps.map((s) => (
                  <li key={s.order} className="text-sm">
                    <span className="font-medium">{s.order}.</span> {s.label}
                    {s.description && <p className="ml-4 text-xs text-muted-foreground">{s.description}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {sop.templates.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Templates</p>
              <div className="space-y-2">
                {sop.templates.map((t, i) => (
                  <div key={i} className="rounded-lg border border-border/50 p-2.5">
                    <p className="text-xs font-medium">{t.label} <span className="text-muted-foreground">({t.channel})</span></p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{t.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default function SopsPage() {
  const [sops, setSops] = useState<Sop[] | null>(null)
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [genDialogOpen, setGenDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [frequency, setFrequency] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetchWithAuth("/api/omni/sops")
    const data = await res.json()
    setSops(data.sops ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate() {
    setSaving(true)
    const res = await fetchWithAuth("/api/omni/sops", { method: "POST", body: JSON.stringify({ title, frequency, steps: [], templates: [] }) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo crear")
      return
    }
    setSops((prev) => [data.sop, ...(prev ?? [])])
    setNewDialogOpen(false)
    setTitle("")
    setFrequency("")
  }

  async function handleGenerate() {
    setSaving(true)
    const res = await fetchWithAuth("/api/omni/sops/generate", { method: "POST", body: JSON.stringify({ description }) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo generar")
      return
    }
    setSops((prev) => [data.sop, ...(prev ?? [])])
    setGenDialogOpen(false)
    setDescription("")
    toast.success("SOP generado con IA")
  }

  async function handleDelete(id: string) {
    await fetchWithAuth(`/api/omni/sops/${id}`, { method: "DELETE" })
    setSops((prev) => (prev ?? []).filter((s) => s.id !== id))
    toast.success("SOP eliminado")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">SOPs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Procedimientos operativos de este negocio.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
            <DialogTrigger render={<Button variant="secondary"><Sparkles /> Generar con IA</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generar SOP con IA</DialogTitle>
                <DialogDescription>Describí el procedimiento — Omni arma los pasos y templates.</DialogDescription>
              </DialogHeader>
              <Textarea placeholder="Ej: proceso de onboarding para un cliente nuevo que firma..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              <DialogFooter>
                <Button onClick={handleGenerate} disabled={saving || !description.trim()}>
                  {saving ? "Generando…" : "Generar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
            <DialogTrigger render={<Button><Plus /> Nuevo SOP</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo SOP</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input placeholder="Frecuencia (ej: Semanal - Lunes)" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={saving || !title.trim()}>
                  {saving ? "Creando…" : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {sops === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : sops.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay SOPs cargados.</p>
      ) : (
        <div className="space-y-3">
          {sops.map((sop) => (
            <SopCard key={sop.id} sop={sop} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
