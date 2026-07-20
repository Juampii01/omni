"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Send, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { useSession } from "@/lib/auth/use-session"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Markdown } from "@/components/ui/markdown"

type ChatMessage = { role: "user" | "assistant"; content: string }

export default function ChatPage() {
  const { session } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchWithAuth("/api/omni/chat")
      .then((r) => r.json())
      .then((data) => {
        if (data.conversation) {
          setMessages(data.conversation.messages ?? [])
          setConversationId(data.conversation.id)
        }
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setSending(true)

    const res = await fetchWithAuth("/api/omni/chat", {
      method: "POST",
      body: JSON.stringify({ message: text, conversationId }),
    })
    const data = await res.json()
    setSending(false)

    if (!res.ok) {
      toast.error(data.error ?? "Error al hablar con el mentor")
      setMessages((prev) => prev.slice(0, -1))
      return
    }

    setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
    setConversationId(data.conversationId)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col space-y-4">
        <Skeleton className="h-16 w-2/3 self-end rounded-2xl" />
        <Skeleton className="h-24 w-3/4 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <div className="mb-4">
        <h1 className="font-heading text-2xl">Chat con el mentor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preguntale a Omni sobre {session?.clientName} — razona con el criterio cargado en Mentor.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Sparkles className="h-6 w-6" />
            <p className="text-sm">Arrancá la conversación — preguntale algo concreto sobre tu negocio.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
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

      <div className="mt-4 flex items-end gap-2 border-t border-border/60 pt-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí tu pregunta…"
          rows={1}
          className="max-h-32 min-h-10 resize-none"
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
