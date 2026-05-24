"use client"

import { useState, useRef } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BrainCircuit, Plus, ChevronDown, ChevronUp, Loader2, Clock, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type ResearchRequest = {
  id: string
  title: string
  prompt: string
  status: "pending" | "processing" | "done" | "failed"
  result_markdown?: string
  tokens_used?: number
  created_at: string
  completed_at?: string
}

const STATUS_CFG = {
  pending:    { label: "Pendiente",   badge: "bg-muted text-muted-foreground border-border" },
  processing: { label: "Procesando",  badge: "bg-amber-400/10 text-amber-400 border-amber-400/30" },
  done:       { label: "Completado",  badge: "bg-brand/10 text-brand border-brand/30" },
  failed:     { label: "Error",       badge: "bg-red-500/10 text-red-500 border-red-500/30" },
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-base font-semibold text-foreground mt-4 mb-1.5">{line.slice(3)}</h2>)
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-lg font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h1>)
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      const content = line.slice(2)
      const parts = content.split(/\*\*(.*?)\*\*/g)
      elements.push(
        <li key={i} className="text-sm text-muted-foreground leading-relaxed ml-4 list-disc">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-foreground font-semibold">{p}</strong> : p)}
        </li>
      )
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />)
    } else {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      elements.push(
        <p key={i} className="text-sm text-muted-foreground leading-relaxed">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-foreground font-semibold">{p}</strong> : p)}
        </p>
      )
    }
  }

  return <div className="space-y-0.5">{elements}</div>
}

function RequestCard({ request }: { request: ResearchRequest }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CFG[request.status]

  return (
    <Card className="border-border hover:border-brand/20 transition-colors">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <CardTitle className="text-sm font-semibold">{request.title}</CardTitle>
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", cfg.badge)}>
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{request.prompt}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />{fmtDate(request.created_at)}
              </span>
              {request.tokens_used && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3" />{request.tokens_used.toLocaleString()} tokens
                </span>
              )}
            </div>
          </div>
          {request.result_markdown && (
            expanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          )}
        </div>
      </CardHeader>

      {expanded && request.result_markdown && (
        <CardContent className="border-t border-border pt-4">
          <MarkdownText text={request.result_markdown} />
        </CardContent>
      )}
    </Card>
  )
}

export function ResearchClient({ initialRequests }: { initialRequests: ResearchRequest[] }) {
  const [requests, setRequests] = useState<ResearchRequest[]>(initialRequests)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !prompt.trim()) { toast.error("Título y prompt son obligatorios"); return }

    setStreaming(true)
    setStreamText("")
    setActiveId(null)

    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), prompt: prompt.trim() }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Error al generar investigación")
        setStreaming(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ""
      let requestId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })

        // Extract request ID from first chunk
        if (!requestId && chunk.includes("__ID__")) {
          const match = chunk.match(/__ID__([^_]+)__/)
          if (match) {
            requestId = match[1]
            setActiveId(requestId)
            const rest = chunk.replace(/__ID__[^_]+__\n/, "")
            fullText += rest
            setStreamText(fullText)
            continue
          }
        }

        fullText += chunk
        setStreamText(fullText)
      }

      // Add the new request to the list
      if (requestId) {
        const newReq: ResearchRequest = {
          id: requestId,
          title: title.trim(),
          prompt: prompt.trim(),
          status: "done",
          result_markdown: fullText,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }
        setRequests(prev => [newReq, ...prev])
      }

      toast.success("Investigación completada")
      setTitle("")
      setPrompt("")
      setShowForm(false)
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Error de conexión")
        console.error(err)
      }
    } finally {
      setStreaming(false)
      setStreamText("")
      setActiveId(null)
    }
  }

  const QUICK_PROMPTS = [
    { label: "Análisis de competidores", prompt: "Analizá las 5 estrategias más efectivas de agencias de marketing digital en LATAM para conseguir clientes de alto ticket. Incluí ángulos de posicionamiento, propuestas de valor diferenciadoras y tácticas de captación." },
    { label: "Ángulos de contenido IG", prompt: "Generá 10 ángulos de contenido para Instagram que funcionen para coaches y consultores de alto ticket. Para cada uno: el hook, el formato recomendado (reel/carrusel/post) y el CTA." },
    { label: "Framework de oferta premium", prompt: "Diseñá un framework completo para estructurar una oferta de servicio premium (>$3.000/mes). Incluí estructura de tiers, bonos estratégicos, garantía y framing del precio." },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inteligencia del Negocio"
        description="Investigaciones AI, análisis estratégicos y diagnósticos versionados."
        icon={BrainCircuit}
      >
        <Button
          onClick={() => setShowForm(f => !f)}
          className="bg-brand hover:bg-brand/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva investigación
        </Button>
      </PageHeader>

      {/* New research form */}
      {showForm && (
        <Card className="border-brand/20 bg-brand/5">
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Análisis de ángulos para clientes e-commerce"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prompt / Pregunta</Label>
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describí en detalle lo que querés investigar o analizar. Cuanto más contexto, mejor el resultado..."
                  required
                />
              </div>

              {/* Quick prompts */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Prompts rápidos:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map(qp => (
                    <button
                      key={qp.label}
                      type="button"
                      onClick={() => { setPrompt(qp.prompt); setTitle(qp.label) }}
                      className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-brand/40 hover:text-brand transition-colors"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={streaming} className="bg-brand hover:bg-brand/90">
                  {streaming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando...</> : "Generar investigación"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Live stream */}
      {streaming && streamText && (
        <Card className="border-brand/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
              <CardTitle className="text-sm">Generando respuesta...</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <MarkdownText text={streamText} />
          </CardContent>
        </Card>
      )}

      {/* Past requests */}
      {requests.length === 0 && !showForm ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <BrainCircuit className="w-6 h-6 text-brand" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Sin investigaciones todavía</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Usá la IA para analizar competidores, generar ángulos de contenido, estructurar ofertas y más.
              </p>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-brand hover:bg-brand/90">
              <Plus className="h-4 w-4 mr-2" />Primera investigación
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.filter(r => r.id !== activeId).map(r => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  )
}
