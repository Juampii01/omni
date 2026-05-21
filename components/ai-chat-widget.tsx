"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Sparkles, X, Send, Loader2, RotateCcw, Copy, Minus, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { AiMessage } from "@/components/ai-message"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { role: "user" | "assistant"; content: string }

// ── Suggestions contextuals ───────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  "¿Cómo está mi pipeline hoy?",
  "Resumime los KPIs de este mes",
  "¿Qué tareas tengo pendientes?",
  "Dame ideas para mejorar la conversión",
  "Escribime un email de seguimiento para un lead frío",
]

// ── Main widget ───────────────────────────────────────────────────────────────

export function AiChatWidget() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, minimized])

  // Focus input when opened
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [open, minimized])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || streaming) return
    setInput("")
    setMinimized(false)

    const userMsg: Message = { role: "user", content }
    const next = [...messages, userMsg]
    setMessages(next)
    setStreaming(true)
    setMessages(prev => [...prev, { role: "assistant", content: "" }])

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      })
      if (!res.ok) throw new Error()

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let acc = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const u = [...prev]
          u[u.length - 1] = { role: "assistant", content: acc }
          return u
        })
      }
    } catch {
      toast.error("No se pudo conectar con el asistente")
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setStreaming(false)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [input, messages, streaming])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  function reset() { setMessages([]); setInput("") }

  function copyMsg(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copiado"))
  }

  const hasMessages = messages.length > 0

  return (
    <>
      {/* ── Panel ──────────────────────────────────────────────────────── */}
      <div
        ref={panelRef}
        className={cn(
          "fixed bottom-24 right-6 z-50 w-[380px] flex flex-col rounded-2xl border border-border bg-background shadow-2xl transition-all duration-300 origin-bottom-right",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none",
          minimized ? "h-14" : "h-[520px]",
          // Mobile: full-screen
          "max-sm:inset-x-3 max-sm:bottom-20 max-sm:w-auto max-sm:right-3"
        )}
        style={{ maxHeight: "calc(100vh - 6rem)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <div className="w-7 h-7 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none">Omni IA</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Powered by Claude · tu asistente del negocio</p>
          </div>
          <div className="flex items-center gap-1">
            {hasMessages && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset} title="Nueva conversación">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMinimized(m => !m)} title={minimized ? "Expandir" : "Minimizar"}>
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)} title="Cerrar">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {!minimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {!hasMessages ? (
                /* Empty state */
                <div className="flex flex-col items-center text-center gap-4 pt-6">
                  <div className="w-12 h-12 rounded-2xl bg-brand-soft flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">¡Hola! Soy tu asistente</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Conozco tu pipeline, KPIs y tareas.<br />Preguntame cualquier cosa.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full mt-1">
                    {QUICK_SUGGESTIONS.slice(0, 4).map(s => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-xs px-3 py-2.5 rounded-xl border border-border hover:border-brand/40 hover:bg-brand-soft/50 transition-all text-foreground/80 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <Link
                    href="/ai"
                    className="flex items-center gap-1 text-xs text-brand hover:underline mt-1"
                    onClick={() => setOpen(false)}
                  >
                    Abrir chat completo <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                /* Messages list */
                <>
                  {messages.map((msg, i) => (
                    <div key={i} className={cn("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}>
                      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                        <AvatarFallback className={cn(
                          "text-[9px] font-semibold",
                          msg.role === "user" ? "bg-brand text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {msg.role === "user" ? "Vos" : "IA"}
                        </AvatarFallback>
                      </Avatar>

                      <div className={cn(
                        "group relative max-w-[85%] rounded-2xl px-3.5 py-2.5",
                        msg.role === "user"
                          ? "bg-brand text-white rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      )}>
                        {msg.role === "user"
                          ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          : <AiMessage content={msg.content} isUser={false} />
                        }
                        {msg.role === "assistant" && msg.content && (
                          <button
                            onClick={() => copyMsg(msg.content)}
                            className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <Copy className="h-2.5 w-2.5" /> Copiar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {streaming && messages[messages.length - 1]?.content === "" && (
                    <div className="flex gap-2.5">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">IA</AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-3">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="px-3 pb-3 shrink-0">
              <div className="flex gap-2 items-end border border-border rounded-xl p-2 bg-muted/30 focus-within:border-brand/50 focus-within:bg-background transition-all">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Preguntame algo… (Enter para enviar)"
                  className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 min-h-[36px] max-h-28 text-sm p-0 bg-transparent"
                  rows={1}
                  disabled={streaming}
                />
                <Button
                  onClick={() => send()}
                  disabled={!input.trim() || streaming}
                  size="icon"
                  className="h-7 w-7 shrink-0 bg-brand hover:bg-brand-hover rounded-lg"
                >
                  {streaming
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Send className="h-3.5 w-3.5" />
                  }
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Floating button ─────────────────────────────────────────────── */}
      <button
        onClick={() => { setOpen(o => !o); setMinimized(false) }}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95",
          open
            ? "bg-foreground text-background"
            : "bg-brand text-white hover:bg-brand-hover"
        )}
        aria-label="Abrir asistente IA"
      >
        {open
          ? <X className="h-5 w-5" />
          : <Sparkles className="h-5 w-5" />
        }
        {/* Pulse dot — only shown when no messages */}
        {!open && !hasMessages && (
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-background" />
        )}
      </button>
    </>
  )
}
