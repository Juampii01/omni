"use client"

import { useEffect, useState } from "react"
import { AtSign, ShieldAlert, Sparkles, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { ConnectCard } from "@/components/layout/connect-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type ConversationState = { id: string; owner: string; etapa: string } | null
type Preview = { sender: "lead" | "client"; body: string | null; sent_at: string } | null
type Conversation = {
  id: string
  participant_username: string | null
  participant_ig_id: string | null
  last_message_at: string | null
  state: ConversationState
  preview: Preview
}
type Message = { id: string; sender: "lead" | "client"; body: string | null; sent_at: string | null }
type Analysis = { estado: string; situacion: string; principio: string; evidencia: string; accion: string; severidad: string }

const OWNER_LABEL: Record<string, string> = {
  sin_reclamar: "Sin reclamar",
  ia_activa: "IA activa",
  escalado_humano: "Con vos",
  cerrado: "Cerrado",
}
const OWNER_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  sin_reclamar: "outline",
  ia_activa: "secondary",
  escalado_humano: "default",
  cerrado: "outline",
}

export default function ConversationsPage() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [takingControl, setTakingControl] = useState(false)

  async function loadIntegration() {
    const res = await fetchWithAuth("/api/omni/integrations")
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo chequear la conexión de Instagram")
      setConnected(false)
      return
    }
    setConnected(!!data.instagram?.connected)
  }

  async function loadConversations() {
    const res = await fetchWithAuth("/api/omni/conversations")
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "No se pudieron cargar las conversaciones")
      return
    }
    setConversations(data.conversations ?? [])
  }

  useEffect(() => {
    loadIntegration()
  }, [])

  useEffect(() => {
    if (connected) loadConversations()
  }, [connected])

  const selected = conversations?.find((c) => c.id === selectedId) ?? null

  async function openConversation(id: string) {
    setSelectedId(id)
    setMessages(null)
    setAnalysis(null)
    const res = await fetchWithAuth(`/api/omni/conversations/${id}/messages`)
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo abrir la conversación")
      return
    }
    setMessages(data.messages ?? [])
  }

  async function handleConnect() {
    setConnecting(true)
    const res = await fetchWithAuth("/api/omni/instagram/connect", { method: "POST" })
    const data = await res.json()
    setConnecting(false)
    if (!res.ok || !data.url) {
      toast.error(data.error ?? "No se pudo iniciar la conexión")
      return
    }
    window.location.href = data.url
  }

  async function handleAnalyze() {
    if (!selected) return
    setAnalyzing(true)
    const res = await fetchWithAuth(`/api/omni/instagram/conversations/${selected.id}/analyze`, { method: "POST" })
    const data = await res.json()
    setAnalyzing(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo analizar la conversación")
      return
    }
    setAnalysis(data.analysis)
  }

  async function handleTakeControl() {
    if (!selected?.state) return
    setTakingControl(true)
    const res = await fetchWithAuth(`/api/omni/conversations/${selected.state.id}/take-control`, { method: "POST" })
    const data = await res.json()
    setTakingControl(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo tomar control")
      return
    }
    setConversations((prev) =>
      (prev ?? []).map((c) => (c.id === selected.id && c.state ? { ...c, state: { ...c.state, owner: "escalado_humano" } } : c))
    )
    toast.success("Ahora controlás vos esta conversación")
  }

  if (connected === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl">Conversaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">Instagram — DMs de prospección y riesgo de conversión.</p>
        </div>
        <ConnectCard
          icon={AtSign}
          title="Conectá Instagram"
          description="Omni va a leer tus DMs de prospección para detectar conversaciones en riesgo antes de perderlas."
          cta={connecting ? "Redirigiendo…" : "Conectar Instagram"}
          onConnect={handleConnect}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Conversaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">Instagram — DMs de prospección y riesgo de conversión.</p>
      </div>

      <div className="flex h-[calc(100vh-12rem)] gap-6">
        <aside className="w-80 shrink-0 space-y-1 overflow-y-auto rounded-2xl border border-border/60 bg-card p-3">
          {conversations === null ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">Todavía no hay conversaciones sincronizadas.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={`w-full rounded-xl p-3 text-left text-sm ${
                  selectedId === c.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">@{c.participant_username ?? "desconocido"}</p>
                  {c.state && (
                    <Badge variant={OWNER_VARIANT[c.state.owner]} className="shrink-0 text-[10px]">
                      {OWNER_LABEL[c.state.owner]}
                    </Badge>
                  )}
                </div>
                {c.preview?.body && <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.preview.body}</p>}
              </button>
            ))
          )}
        </aside>

        <div className="flex-1 overflow-y-auto rounded-2xl border border-border/60 bg-card p-6">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Seleccioná una conversación.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading text-lg">@{selected.participant_username ?? "desconocido"}</p>
                  {selected.state && (
                    <Badge variant={OWNER_VARIANT[selected.state.owner]} className="mt-1 text-[10px]">
                      {OWNER_LABEL[selected.state.owner]}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {selected.state && selected.state.owner !== "escalado_humano" && (
                    <Button size="sm" variant="secondary" onClick={handleTakeControl} disabled={takingControl}>
                      <UserCheck className="h-3.5 w-3.5" /> {takingControl ? "Tomando control…" : "Tomar control"}
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={handleAnalyze} disabled={analyzing}>
                    <Sparkles className="h-3.5 w-3.5" /> {analyzing ? "Analizando…" : "Analizar"}
                  </Button>
                </div>
              </div>

              {analysis && (
                <div className="rounded-xl border border-border/50 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span className="font-medium capitalize">{analysis.estado.replace("_", " ")}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {analysis.severidad}
                    </Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">{analysis.situacion}</p>
                  <p className="mt-2">
                    <span className="font-medium">Acción sugerida:</span> {analysis.accion}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {messages === null ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin mensajes.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        m.sender === "client" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {m.body}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
