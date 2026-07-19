"use client"

import { useEffect, useState } from "react"
import { Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type KnowledgeEntry = {
  id: string
  layer: "framework" | "vocabulario" | "casos" | "objeciones"
  title: string
  content: string
}

const LAYERS: Array<{ key: KnowledgeEntry["layer"]; label: string; hint: string }> = [
  { key: "framework", label: "Principios / framework", hint: "Reglas concretas de cómo debería operar este negocio." },
  { key: "vocabulario", label: "Vocabulario y estilo", hint: "La forma de hablar característica de la metodología." },
  { key: "casos", label: "Casos de referencia", hint: "Ejemplos reales de qué salió bien y qué salió mal." },
  { key: "objeciones", label: "Guion de objeciones", hint: "Los reencuadres específicos de este negocio para las objeciones típicas de su audiencia." },
]

function LayerColumn({
  label,
  hint,
  layer,
  entries,
  onAdd,
  onDelete,
}: {
  label: string
  hint: string
  layer: KnowledgeEntry["layer"]
  entries: KnowledgeEntry[]
  onAdd: (layer: KnowledgeEntry["layer"], title: string, content: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    await onAdd(layer, title, content)
    setTitle("")
    setContent("")
    setSaving(false)
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-sm">{label}</CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="group rounded-lg border border-border/50 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{entry.title}</p>
              <button
                onClick={() => onDelete(entry.id)}
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{entry.content}</p>
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-muted-foreground">Todavía no hay entradas.</p>}

        <div className="space-y-2 border-t border-border/50 pt-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Contenido" rows={2} />
          <Button onClick={handleAdd} disabled={saving} variant="secondary" className="w-full">
            <Plus /> Agregar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MentorPage() {
  const [businessName, setBusinessName] = useState("")
  const [mentorName, setMentorName] = useState("")
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [savingIdentity, setSavingIdentity] = useState(false)

  async function load() {
    const res = await fetchWithAuth("/api/omni/mentor")
    const data = await res.json()
    setBusinessName(data.businessName ?? "")
    setMentorName(data.mentorName ?? "")
    setKnowledge(data.knowledge ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSaveIdentity() {
    setSavingIdentity(true)
    const res = await fetchWithAuth("/api/omni/mentor", {
      method: "PUT",
      body: JSON.stringify({ businessName, mentorName }),
    })
    setSavingIdentity(false)
    if (res.ok) toast.success("Identidad guardada")
    else toast.error("No se pudo guardar")
  }

  async function handleAdd(layer: KnowledgeEntry["layer"], title: string, content: string) {
    const res = await fetchWithAuth("/api/omni/mentor/knowledge", {
      method: "POST",
      body: JSON.stringify({ layer, title, content }),
    })
    const data = await res.json()
    if (data.entry) {
      setKnowledge((prev) => [...prev, data.entry])
      toast.success("Entrada agregada")
    } else {
      toast.error(data.error ?? "No se pudo agregar")
    }
  }

  async function handleDelete(id: string) {
    await fetchWithAuth(`/api/omni/mentor/knowledge/${id}`, { method: "DELETE" })
    setKnowledge((prev) => prev.filter((k) => k.id !== id))
    toast.success("Entrada eliminada")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Mentor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El criterio con el que Omni razona sobre este negocio — identidad y las 3 capas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Identidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Nombre del negocio</label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nombre del mentor</label>
              <Input value={mentorName} onChange={(e) => setMentorName(e.target.value)} className="mt-1" />
            </div>
          </div>
          <Button onClick={handleSaveIdentity} disabled={savingIdentity} className="mt-3">
            {savingIdentity ? "Guardando…" : "Guardar"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LAYERS.map((l) => (
          <LayerColumn
            key={l.key}
            layer={l.key}
            label={l.label}
            hint={l.hint}
            entries={knowledge.filter((k) => k.layer === l.key)}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
