"use client"

import { useState, useRef, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Send, Sparkles, Loader2, RotateCcw, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { AiMessage } from "@/components/ai-message"

type Message = { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "¿Cómo está mi pipeline hoy? Analizalo y decime qué hacer",
  "Resumime los KPIs del mes y decime en qué estoy fallando",
  "¿Qué tareas urgentes tengo pendientes?",
  "Dame 3 acciones concretas para mejorar mi tasa de conversión",
  "Escribime un email de seguimiento para un lead que no respondió hace 5 días",
  "¿Cómo bajo el churn rate? Dame un plan de acción",
]

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

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || streaming) return
    setInput("")

    const userMsg: Message = { role: "user", content }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setStreaming(true)

    // Add empty assistant message to stream into
    setMessages(prev => [...prev, { role: "assistant", content: "" }])

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!res.ok) {
        throw new Error("Error del servidor")
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
    } catch (err) {
      toast.error("No se pudo conectar con el asistente")
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setStreaming(false)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copiado"))
  }

  function reset() {
    setMessages([])
    setInput("")
    textareaRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="IA Asistente" description="Powered by Claude" />
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
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

      {/* Input */}
      <div className="mt-4 flex gap-2 items-end border border-border rounded-2xl p-2 bg-background focus-within:border-brand/50 focus-within:ring-1 focus-within:ring-brand/20 transition-all">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí tu pregunta… (Enter para enviar, Shift+Enter para nueva línea)"
          className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 min-h-[40px] max-h-40 text-sm p-1"
          rows={1}
          disabled={streaming}
        />
        <Button
          onClick={() => send()}
          disabled={!input.trim() || streaming}
          size="icon"
          className="h-8 w-8 shrink-0 bg-brand hover:bg-brand-hover rounded-xl"
        >
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
