"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Send, Sparkles, FlagTriangleRight, UserPlus, ArrowLeft, Link2, Check } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Markdown } from "@/components/ui/markdown"

type DiscoveryMessage = { role: "user" | "assistant"; content: string }

type DiscoverySummary = {
  painPoints: string[]
  desiredCapabilities: string[]
  recommendedModules: Array<{ module: string; rationale: string; effort: "bajo" | "medio" | "alto" }>
  gaps: string[]
  suggestedScope: { call: "lean_v1" | "full_scope"; rationale: string }
  openQuestions: string[]
}

type Session = {
  id: string
  prospect_name: string
  niche: string | null
  status: "in_progress" | "completed" | "archived"
  messages: DiscoveryMessage[]
  summary: DiscoverySummary | null
  converted_client_id: string | null
  share_token: string | null
  submitted_at: string | null
  prior_context: string | null
}

const EFFORT_VARIANT: Record<string, "default" | "outline" | "secondary"> = { bajo: "default", medio: "secondary", alto: "outline" }

function PriorContextSection({ session, onSaved }: { session: Session; onSaved: (item: Session) => void }) {
  const [value, setValue] = useState(session.prior_context ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const res = await fetchWithAuth(`/api/admin/discovery/${session.id}`, { method: "PATCH", body: JSON.stringify({ priorContext: value }) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo guardar el contexto")
      return
    }
    onSaved(data.item)
    toast.success(session.messages.length === 0 && value.trim() ? "Contexto guardado — mensaje de apertura generado" : "Contexto guardado")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Contexto previo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Lo que ya sabés de este prospecto (ej. lo hablado por WhatsApp) — la IA lo va a dar por sabido en vez de volver a preguntarlo."
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Solo información sobre el negocio de {session.prospect_name} — nunca menciones acá la configuración de otro cliente real.
        </p>
        <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar contexto"}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DiscoverySessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ownerPassword, setOwnerPassword] = useState("")
  const [converting, setConverting] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  function handleCopyLink() {
    if (!session?.share_token) return
    navigator.clipboard.writeText(`${window.location.origin}/discovery/${session.share_token}`)
    setLinkCopied(true)
    toast.success("Link copiado")
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function load() {
    const res = await fetchWithAuth(`/api/admin/discovery/${id}`)
    const data = await res.json()
    if (res.ok) setSession(data.item)
    else toast.error(data.error ?? "No se pudo cargar la sesión")
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [session?.messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending || !session) return
    setInput("")
    setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, { role: "user", content: text }] } : prev))
    setSending(true)

    const res = await fetchWithAuth(`/api/admin/discovery/${id}/message`, { method: "POST", body: JSON.stringify({ message: text }) })
    const data = await res.json()
    setSending(false)

    if (!res.ok) {
      toast.error(data.error ?? "Error en la entrevista")
      setSession((prev) => (prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev))
      return
    }

    setSession((prev) =>
      prev ? { ...prev, status: "in_progress", messages: [...prev.messages, { role: "assistant", content: data.reply }] } : prev
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleFinish() {
    setFinishing(true)
    const res = await fetchWithAuth(`/api/admin/discovery/${id}/finish`, { method: "POST" })
    const data = await res.json()
    setFinishing(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo generar el resumen")
      return
    }
    setSession((prev) => (prev ? { ...prev, summary: data.summary, status: "completed" } : prev))
    toast.success("Resumen generado")
  }

  async function handleConvert() {
    setConverting(true)
    const res = await fetchWithAuth(`/api/admin/discovery/${id}/convert`, {
      method: "POST",
      body: JSON.stringify({ ownerEmail, ownerPassword }),
    })
    const data = await res.json()
    setConverting(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo convertir en cliente")
      return
    }
    toast.success(`Cliente creado a partir de "${session?.prospect_name}"`)
    setConvertOpen(false)
    setSession((prev) => (prev ? { ...prev, converted_client_id: data.clientId } : prev))
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push("/admin/discovery")} className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Descubrimiento
          </button>
          <h1 className="font-heading text-2xl">{session.prospect_name}</h1>
          {session.niche && <p className="text-sm text-muted-foreground">{session.niche}</p>}
          {session.submitted_at && (
            <p className="mt-1 text-xs text-primary">{session.prospect_name} ya envió sus respuestas directamente</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {session.share_token && (
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />} Copiar link para {session.prospect_name}
            </Button>
          )}
          {session.converted_client_id ? (
            <Badge>Convertido en cliente</Badge>
          ) : (
            session.status === "completed" && (
              <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
                <DialogTrigger
                  render={
                    <Button variant="secondary">
                      <UserPlus className="h-4 w-4" /> Convertir en cliente
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convertir en cliente</DialogTitle>
                    <DialogDescription>Crea el tenant "{session.prospect_name}" y su primer usuario owner.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Email del owner" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                    <Input
                      placeholder="Contraseña (mín. 8 caracteres)"
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleConvert} disabled={converting || !ownerEmail || ownerPassword.length < 8}>
                      {converting ? "Creando…" : "Crear cliente"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )
          )}
          {!session.converted_client_id && (
            <Button onClick={handleFinish} disabled={finishing || session.messages.length === 0}>
              <FlagTriangleRight className="h-4 w-4" /> {finishing ? "Generando…" : session.status === "completed" ? "Volver a finalizar" : "Finalizar"}
            </Button>
          )}
        </div>
      </div>

      <PriorContextSection session={session} onSaved={(item) => setSession(item)} />

      <div className="flex h-[28rem] flex-col rounded-2xl border border-border/60 p-4">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {session.messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Sparkles className="h-6 w-6" />
              <p className="text-sm">Arrancá contando qué sabés del prospecto — la IA va a ir preguntando el resto.</p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {session.messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border/60 bg-card"
                  }`}
                >
                  {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-card px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {session.status !== "archived" && !session.converted_client_id && (
          <div className="mt-3 flex items-end gap-2 border-t border-border/60 pt-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={session.status === "completed" ? "Seguir hablando reabre la sesión…" : "Escribí la respuesta del prospecto…"}
              rows={1}
              className="max-h-32 min-h-10 resize-none"
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {session.summary && (
        <div className="space-y-4">
          <h2 className="font-heading text-lg">Resumen del descubrimiento</h2>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dolores</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {session.summary.painPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Qué pidió poder hacer</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {session.summary.desiredCapabilities.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Módulos recomendados (ya existen en Omni)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {session.summary.recommendedModules.map((m, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-border/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{m.module}</p>
                    <p className="text-xs text-muted-foreground">{m.rationale}</p>
                  </div>
                  <Badge variant={EFFORT_VARIANT[m.effort]}>{m.effort}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {session.summary.gaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gaps — no existe todavía en Omni</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {session.summary.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Alcance sugerido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Badge variant={session.summary.suggestedScope.call === "full_scope" ? "default" : "outline"}>
                {session.summary.suggestedScope.call === "full_scope" ? "Alcance completo" : "v1 magro"}
              </Badge>
              <p className="text-sm text-muted-foreground">{session.summary.suggestedScope.rationale}</p>
            </CardContent>
          </Card>

          {session.summary.openQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preguntas abiertas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {session.summary.openQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
