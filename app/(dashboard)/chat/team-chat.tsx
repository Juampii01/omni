"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, MessagesSquare, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Profile = { id: string; full_name: string | null; email: string; avatar_url: string | null }
type Msg = { id: string; sender_id: string; body: string; created_at: string; channel: string }

function initials(name?: string | null, email?: string): string {
  const base = name?.trim() || email?.split("@")[0] || "?"
  return base.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date(); yest.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Hoy"
  if (d.toDateString() === yest.toDateString()) return "Ayer"
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
}

export function TeamChat({
  initialMessages,
  currentUserId,
  profiles,
}: {
  initialMessages: Msg[]
  currentUserId: string
  profiles: Profile[]
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages)
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const profileMap = useMemo(() => {
    const m: Record<string, Profile> = {}
    for (const p of profiles) m[p.id] = p
    return m
  }, [profiles])

  // Auto-scroll al fondo cuando llegan mensajes
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Realtime
  useEffect(() => {
    const sb = createClient()
    const channel = sb
      .channel("realtime-team-chat")
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "team_messages" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const m = payload.new as Msg
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
        },
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "DELETE", schema: "public", table: "team_messages" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          setMessages((prev) => prev.filter((x) => x.id !== payload.old?.id))
        },
      )
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [])

  async function send() {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    const sb = createClient() as any
    const { error } = await sb
      .from("team_messages")
      .insert({ body: text, sender_id: currentUserId, channel: "general" })
    if (error) {
      toast.error("No se pudo enviar el mensaje")
    } else {
      setBody("")
    }
    setSending(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5 flex-shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <MessagesSquare className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-foreground font-sans"># general</h1>
          <p className="text-xs text-muted-foreground">{profiles.length} en el equipo</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessagesSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Todavía no hay mensajes.</p>
            <p className="text-xs text-muted-foreground/60">Arrancá la conversación del equipo.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1]
            const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at)
            const sameSenderAsPrev = prev && prev.sender_id === m.sender_id && !showDay
            const isMine = m.sender_id === currentUserId
            const p = profileMap[m.sender_id]
            const name = p?.full_name || p?.email?.split("@")[0] || "Miembro"

            return (
              <div key={m.id}>
                {showDay && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 bg-muted/40 rounded-full px-3 py-1 font-sans">
                      {dayLabel(m.created_at)}
                    </span>
                  </div>
                )}
                <div className={cn("flex gap-2.5 items-end", isMine && "flex-row-reverse", sameSenderAsPrev ? "mt-0.5" : "mt-3")}>
                  <div className="w-7 flex-shrink-0">
                    {!sameSenderAsPrev && (
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={p?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                          {initials(p?.full_name, p?.email)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div className={cn("max-w-[72%] min-w-0", isMine ? "items-end" : "items-start", "flex flex-col")}>
                    {!sameSenderAsPrev && (
                      <span className={cn("text-[11px] text-muted-foreground mb-1 px-1 font-sans", isMine && "self-end")}>
                        {isMine ? "Vos" : name} · {timeLabel(m.created_at)}
                      </span>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words font-sans",
                        isMine
                          ? "bg-brand text-brand-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md",
                      )}
                    >
                      {m.body}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3 flex-shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-brand/50 transition-colors">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Escribí un mensaje para el equipo…"
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none max-h-32 font-sans py-1"
          />
          <button
            onClick={send}
            disabled={!body.trim() || sending}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-hover transition-colors"
            aria-label="Enviar"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
