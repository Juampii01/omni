"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, MessageCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Profile = { id: string; full_name: string | null; email: string; avatar_url: string | null }
type Msg = {
  id: string
  client_id: string
  sender_id: string | null
  direction: "outbound" | "inbound"
  body: string
  created_at: string
}

function initials(name?: string | null, email?: string): string {
  const base = name?.trim() || email?.split("@")[0] || "?"
  return base.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
}
function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function ClientConversation({
  clientId,
  clientName,
  clientAvatar,
  currentUserId,
  initialMessages,
  profiles,
}: {
  clientId: string
  clientName: string
  clientAvatar?: string | null
  currentUserId: string
  initialMessages: Msg[]
  profiles: Profile[]
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages)
  const [body, setBody] = useState("")
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const profileMap = useMemo(() => {
    const m: Record<string, Profile> = {}
    for (const p of profiles) m[p.id] = p
    return m
  }, [profiles])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const sb = createClient()
    const channel = sb
      .channel(`realtime-client-msgs-${clientId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "client_messages", filter: `client_id=eq.${clientId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const m = payload.new as Msg
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
        },
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "DELETE", schema: "public", table: "client_messages", filter: `client_id=eq.${clientId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => setMessages((prev) => prev.filter((x) => x.id !== payload.old?.id)),
      )
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [clientId])

  async function send() {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    const sb = createClient() as any
    const row = {
      client_id: clientId,
      body: text,
      direction,
      sender_id: direction === "outbound" ? currentUserId : null,
    }
    const { error } = await sb.from("client_messages").insert(row)
    if (error) {
      toast.error("No se pudo guardar el mensaje")
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <MessageCircle className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold text-foreground">Conversación</h2>
        <span className="ml-auto text-xs text-muted-foreground">{messages.length} mensajes</span>
      </div>

      {/* Mensajes */}
      <div className="max-h-[28rem] min-h-[12rem] overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center">
            <MessageCircle className="h-7 w-7 text-muted-foreground/30 mb-2.5" />
            <p className="text-sm text-muted-foreground">Sin mensajes con {clientName.split(" ")[0]} todavía.</p>
            <p className="text-xs text-muted-foreground/60">Escribí abajo para empezar el hilo.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isOut = m.direction === "outbound"
            const p = m.sender_id ? profileMap[m.sender_id] : undefined
            const senderName = isOut ? (p?.full_name || "Equipo") : clientName.split(" ")[0]
            return (
              <div key={m.id} className={cn("flex gap-2.5 items-end", isOut && "flex-row-reverse")}>
                <Avatar className="h-7 w-7 flex-shrink-0">
                  {isOut ? (
                    <>
                      <AvatarImage src={p?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px] font-semibold bg-brand/15 text-brand">
                        {initials(p?.full_name, p?.email)}
                      </AvatarFallback>
                    </>
                  ) : (
                    <>
                      <AvatarImage src={clientAvatar ?? undefined} />
                      <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                        {initials(clientName)}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div className={cn("max-w-[72%] flex flex-col", isOut && "items-end")}>
                  <span className="text-[11px] text-muted-foreground mb-1 px-1">
                    {senderName} · {timeLabel(m.created_at)}
                  </span>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                      isOut
                        ? "bg-brand text-brand-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md",
                    )}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Toggle dirección */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setDirection("outbound")}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors font-sans",
              direction === "outbound" ? "bg-brand/15 text-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Mensaje del equipo
          </button>
          <button
            onClick={() => setDirection("inbound")}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors font-sans",
              direction === "inbound" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Registrar respuesta del cliente
          </button>
        </div>
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-brand/50 transition-colors">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={direction === "outbound" ? `Escribile a ${clientName.split(" ")[0]}…` : `Anotá lo que dijo ${clientName.split(" ")[0]}…`}
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
