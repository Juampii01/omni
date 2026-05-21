"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import {
  Send, Sparkles, Loader2, RotateCcw, Copy, AlertTriangle,
  Plus, Trash2, MessageSquare, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AiMessage } from "@/components/ai-message"
import { useAiCredits } from "@/hooks/use-ai-credits"
import { useConversations, type Conversation } from "@/hooks/use-conversations"
import { createClient } from "@/lib/supabase/client"

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { role: "user" | "assistant"; content: string }

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "¿Cómo está mi pipeline hoy? Analizalo y decime qué hacer",
  "Resumime los KPIs del mes y decime en qué estoy fallando",
  "¿Qué tareas urgentes tengo pendientes?",
  "Dame 3 acciones concretas para mejorar mi tasa de conversión",
  "Escribime un email de seguimiento para un lead que no respondió hace 5 días",
  "¿Cómo bajo el churn rate? Dame un plan de acción",
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return "ahora"
  if (mins  < 60) return `hace ${mins}m`
  if (hours < 24) return `hace ${hours}h`
  if (days  < 7)  return `hace ${days}d`
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, onCopy }: { msg: Message; onCopy: (text: string) => void }) {
  const isUser = msg.role === "user"
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className={cn("text-[11px] font-semibold", isUser ? "bg-brand text-white" : "bg-muted text-muted-foreground")}>
          {isUser ? "Vos" : "IA"}
        </AvatarFallback>
      </Avatar>
      <div className={cn(
        "group relative max-w-[80%] rounded-2xl px-4 py-3",
        isUser
          ? "bg-brand text-white rounded-tr-sm"
          : "bg-muted text-foreground rounded-tl-sm"
      )}>
        {isUser
          ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          : <AiMessage content={msg.content} isUser={false} />
        }
        {!isUser && msg.content && (
          <button
            onClick={() => onCopy(msg.content)}
            className="absolute -bottom-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Copy className="h-3 w-3" /> Copiar
          </button>
        )}
      </div>
    </div>
  )
}

// ── Conversation list item ────────────────────────────────────────────────────

function ConversationItem({
  conv,
  active,
  onClick,
  onDelete,
}: {
  conv: Conversation
  active: boolean
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
        active
          ? "bg-brand/10 text-brand"
          : "hover:bg-muted/60 text-foreground/80 hover:text-foreground"
      )}
    >
      <MessageSquare className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", active ? "text-brand" : "text-muted-foreground")} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate leading-snug">
          {conv.title ?? "Conversación"}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {relativeDate(conv.updated_at)}
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive text-muted-foreground shrink-0 mt-0.5"
        title="Eliminar conversación"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AiPage() {
  const [messages, setMessages]           = useState<Message[]>([])
  const [input, setInput]                 = useState("")
  const [streaming, setStreaming]         = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen]     = useState(true)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { used, limit, percentage, isLimitReached, isWarning, refresh: refreshCredits } = useAiCredits()
  const { conversations, isLoading: loadingConvs, refresh: refreshConversations } = useConversations()

  useEffect(() => { document.title = "IA Asistente — Omni" }, [])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px"
  }, [input])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Load a past conversation ────────────────────────────────────────────────

  async function openConversation(convId: string) {
    if (streaming) return
    const sb = createClient() as any
    const { data } = await sb
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })

    setConversationId(convId)
    setMessages(
      (data ?? [])
        .filter((m: any) => m.role !== "system")
        .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content }))
    )
    setInput("")
  }

  // ── Delete a conversation ───────────────────────────────────────────────────

  async function deleteConversation(convId: string) {
    if (!confirm("¿Eliminar esta conversación? No se puede deshacer.")) return
    const sb = createClient() as any
    const { error } = await sb.from("ai_conversations").delete().eq("id", convId)
    if (error) {
      toast.error("No se pudo eliminar la conversación")
      return
    }
    refreshConversations()
    if (conversationId === convId) {
      setConversationId(null)
      setMessages([])
    }
  }

  // ── New conversation ────────────────────────────────────────────────────────

  function newConversation() {
    setMessages([])
    setInput("")
    setConversationId(null)
    textareaRef.current?.focus()
  }

  // ── Send message ────────────────────────────────────────────────────────────

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || streaming) return
    setInput("")

    const userMsg: Message = { role: "user", content }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setStreaming(true)
    setMessages(prev => [...prev, { role: "assistant", content: "" }])

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, conversationId }),
      })

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.message ?? "Límite de créditos de IA alcanzado")
        setMessages(prev => prev.slice(0, -1))
        return
      }
      if (!res.ok) throw new Error("Error del servidor")

      // Capture conversation ID from response header
      const returnedConvId = res.headers.get("X-Conversation-Id")
      if (returnedConvId) {
        setConversationId(returnedConvId)
        if (!conversationId) refreshConversations()
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const final = accumulated
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: "assistant", content: final }
          return updated
        })
      }

      refreshCredits()
      // Refresh sidebar so the conversation moves to top
      refreshConversations()
    } catch {
      toast.error("No se pudo conectar con el asistente")
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setStreaming(false)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [input, messages, streaming, conversationId, refreshCredits, refreshConversations])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copiado"))
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-0 h-[calc(100vh-8rem)]">

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <div className={cn(
        "shrink-0 flex flex-col border-r border-border transition-all duration-200",
        sidebarOpen ? "w-60" : "w-0 overflow-hidden"
      )}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border shrink-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Historial
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={newConversation}
            title="Nueva conversación"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
          {loadingConvs ? (
            <div className="space-y-1.5 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-6 px-3 leading-relaxed">
              Tus conversaciones aparecerán acá
            </p>
          ) : (
            conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                active={conversationId === conv.id}
                onClick={() => openConversation(conv.id)}
                onDelete={() => deleteConversation(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Main chat ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 pl-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setSidebarOpen(o => !o)}
              title={sidebarOpen ? "Ocultar historial" : "Ver historial"}
            >
              <ChevronRight className={cn("h-4 w-4 transition-transform", sidebarOpen && "rotate-180")} />
            </Button>
            <PageHeader title="IA Asistente" description="Powered by Claude" />
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={newConversation} className="text-muted-foreground">
              <RotateCcw className="h-4 w-4 mr-2" />Nueva conversación
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-soft flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-brand" />
              </div>
              <div>
                <p className="text-base font-semibold">¿En qué te ayudo hoy?</p>
                <p className="text-sm text-muted-foreground mt-1">Preguntame cualquier cosa sobre tu negocio</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 w-full max-w-2xl">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-xs p-3 rounded-xl border border-border hover:border-brand/40 hover:bg-brand-soft transition-all leading-relaxed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} onCopy={copyToClipboard} />
              ))}
              {streaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[11px] bg-muted text-muted-foreground">IA</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Credits banner */}
        {isLimitReached ? (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Límite de créditos de IA alcanzado. Contactá al admin para aumentarlo.</span>
          </div>
        ) : isWarning ? (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl border border-warning/30 bg-warning/5 text-warning text-sm shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{used.toLocaleString("es-AR")} / {limit.toLocaleString("es-AR")} créditos usados ({percentage}%)</span>
          </div>
        ) : null}

        {/* Input */}
        <div className="mt-3 space-y-1.5 shrink-0">
          <div className="flex gap-2 items-end border border-border rounded-2xl p-2 bg-background focus-within:border-brand/50 focus-within:ring-1 focus-within:ring-brand/20 transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLimitReached ? "Créditos agotados" : "Escribí tu pregunta… (Enter para enviar, Shift+Enter para nueva línea)"}
              className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 min-h-[40px] max-h-40 text-sm p-1"
              rows={1}
              disabled={streaming || isLimitReached}
            />
            <Button
              onClick={() => send()}
              disabled={!input.trim() || streaming || isLimitReached}
              size="icon"
              className="h-8 w-8 shrink-0 bg-brand hover:bg-brand-hover rounded-xl"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {!isWarning && !isLimitReached && (
            <p className="text-[10px] text-muted-foreground/50 text-right">
              {used.toLocaleString("es-AR")} / {limit.toLocaleString("es-AR")} créditos usados
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
