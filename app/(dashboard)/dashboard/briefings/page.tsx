"use client"

import { useEffect, useState } from "react"
import { Sparkles, ListPlus, MessageCircleMore } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { parseLocalDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { SlackFinding, ProspectRisk } from "@/lib/omni/types"
import type { UnansweredItem } from "@/lib/omni/unanswered-digest"

type Briefing = {
  id: string
  date: string
  type: "leads" | "prospecting" | "community" | "unanswered"
  findings: SlackFinding[] | ProspectRisk[] | UnansweredItem[]
  messages_analyzed: number
  created_at: string
}

const SEVERITY_VARIANT: Record<string, "destructive" | "default" | "secondary"> = {
  alta: "destructive",
  media: "default",
  baja: "secondary",
}

const SEVERITY_PRIORITY: Record<string, "urgente" | "importante" | "con-tiempo"> = {
  alta: "urgente",
  media: "importante",
  baja: "con-tiempo",
}

const TYPE_LABEL: Record<Briefing["type"], string> = {
  leads: "Leads",
  prospecting: "Prospección",
  community: "Comunidad",
  unanswered: "Sin responder",
}

const ANALYZED_LABEL: Record<Briefing["type"], string> = {
  leads: "leads analizados",
  prospecting: "conversaciones analizadas",
  community: "canales analizados",
  unanswered: "conversaciones revisadas",
}

function CreateTaskButton({ title, description, severidad }: { title: string; description: string; severidad: string }) {
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)

  async function handleCreateTask() {
    setCreating(true)
    const res = await fetchWithAuth("/api/omni/tasks", {
      method: "POST",
      body: JSON.stringify({ title, description, labelText: "Hallazgo IA", priority: SEVERITY_PRIORITY[severidad] ?? "con-tiempo" }),
    })
    setCreating(false)
    if (!res.ok) {
      toast.error("No se pudo crear la tarea")
      return
    }
    setCreated(true)
    toast.success("Tarea creada en Tareas → Por hacer")
  }

  return (
    <Button size="sm" variant="secondary" className="mt-3" onClick={handleCreateTask} disabled={creating || created}>
      <ListPlus className="h-3.5 w-3.5" /> {created ? "Tarea creada" : creating ? "Creando…" : "Crear tarea"}
    </Button>
  )
}

function FindingCard({ finding }: { finding: SlackFinding }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{finding.titulo}</p>
        <Badge variant={SEVERITY_VARIANT[finding.severidad] ?? "secondary"} className="shrink-0 capitalize">
          {finding.severidad}
        </Badge>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{finding.descripcion}</p>
      <p className="mt-2 text-xs italic text-muted-foreground">&quot;{finding.evidencia}&quot;</p>
      {finding.canales?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {finding.canales.map((c, i) => (
            <span key={i} className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
              {c}
            </span>
          ))}
        </div>
      )}
      <CreateTaskButton title={finding.titulo} description={`${finding.descripcion}\n\nEvidencia: ${finding.evidencia}`} severidad={finding.severidad} />
    </div>
  )
}

function ProspectRiskCard({ finding }: { finding: ProspectRisk }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">@{finding.prospecto}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant={finding.estado === "irremontable" ? "destructive" : "outline"} className="capitalize">
            {finding.estado === "irremontable" ? "Irremontable" : "En riesgo"}
          </Badge>
          <Badge variant={SEVERITY_VARIANT[finding.severidad] ?? "secondary"} className="capitalize">
            {finding.severidad}
          </Badge>
        </div>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{finding.situacion}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-medium">Principio:</span> {finding.principio}
      </p>
      <p className="mt-2 text-xs italic text-muted-foreground">&quot;{finding.evidencia}&quot;</p>
      <p className="mt-2 text-xs text-foreground">
        <span className="font-medium">Acción:</span> {finding.accion}
      </p>
      <CreateTaskButton
        title={`Prospecto en riesgo: @${finding.prospecto}`}
        description={`${finding.situacion}\n\nAcción: ${finding.accion}\n\nEvidencia: ${finding.evidencia}`}
        severidad={finding.severidad}
      />
    </div>
  )
}

const PLATFORM_LABEL: Record<UnansweredItem["platform"], string> = { instagram: "Instagram", slack: "Slack" }

function UnansweredCard({ finding }: { finding: UnansweredItem }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
          <MessageCircleMore className="h-4 w-4 text-accent-foreground" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-medium">@{finding.participante}</p>
          <p className="text-xs text-muted-foreground">&quot;{finding.ultimo_mensaje}&quot;</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="outline">{PLATFORM_LABEL[finding.platform]}</Badge>
        <span className="text-xs text-muted-foreground">{finding.hace}</span>
      </div>
    </div>
  )
}

export default function BriefingsPage() {
  const [briefings, setBriefings] = useState<Briefing[] | null>(null)
  const [generating, setGenerating] = useState<Briefing["type"] | null>(null)

  async function load() {
    const res = await fetchWithAuth("/api/omni/briefings")
    const data = await res.json()
    setBriefings(data.items ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleGenerate(type: Briefing["type"]) {
    setGenerating(type)
    const res = await fetchWithAuth("/api/omni/briefings/generate", { method: "POST", body: JSON.stringify({ type }) })
    const data = await res.json()
    setGenerating(null)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo generar el análisis")
      return
    }
    const count = data.briefing?.findings?.length ?? 0
    toast.success(count > 0 ? `Análisis listo: ${count} hallazgo(s)` : "Análisis listo: sin patrones relevantes por ahora")
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl">Briefings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Historial de análisis del mentor sobre leads, prospección y conversaciones.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => handleGenerate("leads")} disabled={generating !== null}>
            <Sparkles className="h-4 w-4" /> {generating === "leads" ? "Analizando…" : "Generar análisis de leads"}
          </Button>
          <Button variant="secondary" onClick={() => handleGenerate("prospecting")} disabled={generating !== null}>
            <Sparkles className="h-4 w-4" /> {generating === "prospecting" ? "Analizando…" : "Generar análisis de prospección"}
          </Button>
          <Button variant="secondary" onClick={() => handleGenerate("unanswered")} disabled={generating !== null}>
            <MessageCircleMore className="h-4 w-4" /> {generating === "unanswered" ? "Revisando…" : "Ver sin responder"}
          </Button>
        </div>
      </div>

      {briefings === null ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : briefings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Todavía no se generó ningún análisis. Generá el primero con alguno de los botones de arriba.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {briefings.map((b) => (
            <Card key={b.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {parseLocalDate(b.date).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" })}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{TYPE_LABEL[b.type] ?? b.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {b.messages_analyzed} {ANALYZED_LABEL[b.type] ?? "analizados"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {b.findings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {b.type === "unanswered" ? "Todo respondido — sin conversaciones pendientes." : "Sin patrones relevantes detectados ese día."}
                  </p>
                ) : b.type === "prospecting" ? (
                  (b.findings as ProspectRisk[]).map((f, i) => <ProspectRiskCard key={i} finding={f} />)
                ) : b.type === "unanswered" ? (
                  (b.findings as UnansweredItem[]).map((f, i) => <UnansweredCard key={i} finding={f} />)
                ) : (
                  (b.findings as SlackFinding[]).map((f, i) => <FindingCard key={i} finding={f} />)
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
