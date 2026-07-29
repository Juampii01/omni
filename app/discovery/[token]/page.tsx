"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Send, Sparkles, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Markdown } from "@/components/ui/markdown"

type DiscoveryMessage = { role: "user" | "assistant"; content: string }

type PublicSession = {
  prospectName: string
  niche: string | null
  messages: DiscoveryMessage[]
  submitted: boolean
}

export default function PublicDiscoveryPage() {
  const { token } = useParams<{ token: string }>()
  const [session, setSession] = useState<PublicSession | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  async function load() {
    const res = await fetch(`/api/discovery/${token}`)
    if (!res.ok) {
      setNotFound(true)
      return
    }
    setSession(await res.json())
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [session?.messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending || !session) return
    setInput("")
    setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, { role: "user", content: text }] } : prev))
    setSending(true)

    const res = await fetch(`/api/discovery/${token}/message`, { method: "POST", body: JSON.stringify({ message: text }) })
    const data = await res.json()
    setSending(false)

    if (!res.ok) {
      toast.error(data.error ?? "Algo salió mal, probá de nuevo")
      setSession((prev) => (prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev))
      return
    }

    setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, { role: "assistant", content: data.reply }] } : prev))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    const res = await fetch(`/api/discovery/${token}/submit`, { method: "POST" })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo enviar")
      return
    }
    setSession((prev) => (prev ? { ...prev, submitted: true } : prev))
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Este link no es válido.</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center space-y-4 px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  if (session.submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <p className="font-heading text-xl">Gracias, {session.prospectName}</p>
          <p className="max-w-sm text-sm text-muted-foreground">Recibimos tus respuestas. Te contactamos con los próximos pasos.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
      <div className="mb-4">
        <h1 className="font-heading text-2xl">Hola, {session.prospectName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unas preguntas para entender bien qué necesitás — no hay respuestas correctas o incorrectas, contá con el detalle que tengas.
        </p>
      </div>

      <div className="flex flex-1 flex-col rounded-2xl border border-border/60 p-4">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "26rem" }}>
          {session.messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Sparkles className="h-6 w-6" />
              <p className="text-sm">Contanos un poco de tu negocio para arrancar.</p>
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

        <div className="mt-3 flex items-end gap-2 border-t border-border/60 pt-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu respuesta…"
            rows={1}
            className="max-h-32 min-h-10 resize-none"
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {session.messages.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={handleSubmit} disabled={submitting || sending}>
            {submitting ? "Enviando…" : "Ya terminé, enviar respuestas"}
          </Button>
        </div>
      )}
    </div>
  )
}
