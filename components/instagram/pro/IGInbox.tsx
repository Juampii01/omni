"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, Send, ChevronLeft, MessageSquare, Hash, Loader2, Clock, RefreshCw, EyeOff } from "lucide-react"
import { IG_GRADIENT_CSS } from "./ig-theme"
import { useInstagramDataContext } from "@/components/instagram/InstagramDataContext"
import { useInstagramMessages, type IGConversation } from "@/hooks/useInstagramMessages"
import { useInstagramComments } from "@/hooks/useInstagramComments"

type InboxMode = "dms" | "comments"
const WINDOW_MS = 24 * 60 * 60 * 1000

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "ahora"
  if (diff < 3600) return Math.floor(diff / 60) + "m"
  if (diff < 86400) return Math.floor(diff / 3600) + "h"
  return Math.floor(diff / 86400) + "d"
}

function isWindowOpen(conv: IGConversation): boolean {
  if (!conv.lastUserMessageAt) return false
  return Date.now() - new Date(conv.lastUserMessageAt).getTime() < WINDOW_MS
}

export function IGInbox() {
  const { connected, reels } = useInstagramDataContext()
  const { convsState, threadState, syncing, sync, loadConversations, loadThread, sendMessage } = useInstagramMessages()
  const comments = useInstagramComments()

  const [mode, setMode] = useState<InboxMode>("dms")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null)
  const [reply, setReply] = useState("")
  const [sendError, setSendError] = useState("")
  const [replyText, setReplyText] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (connected && mode === "dms") void loadConversations()
  }, [connected, mode, loadConversations])

  useEffect(() => {
    if (!selectedId) return
    void loadThread(selectedId).then(() => {
      setReply("")
      setSendError("")
    })
  }, [selectedId, loadThread])

  useEffect(() => {
    if (threadState.status === "ok") bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [threadState])

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <MessageCircle size={32} className="text-[var(--muted-foreground)]" />
        <p className="text-sm text-[var(--muted-foreground)]">Conectá tu cuenta de Instagram para gestionar mensajes.</p>
      </div>
    )
  }

  const conversations = convsState.status === "ok" ? convsState.conversations : []
  const selectedConv = conversations.find((c) => c.conversationId === selectedId) ?? null
  const messages = threadState.status === "ok" ? threadState.messages : []
  const windowOpen = selectedConv ? isWindowOpen(selectedConv) : false

  async function handleSend() {
    if (!reply.trim() || !selectedId) return
    setSendError("")
    const result = await sendMessage(selectedId, reply.trim())
    if (result.ok) {
      setReply("")
    } else {
      setSendError(result.error === "MESSAGING_WINDOW_CLOSED" ? "La ventana de 24h está cerrada. El usuario debe escribirte primero." : result.error)
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden" style={{ minHeight: 480 }}>
      {/* Header */}
      <div className="flex items-center border-b border-[var(--border)] px-4 py-3 gap-3">
        {selectedId && (
          <button onClick={() => setSelectedId(null)} className="mr-1">
            <ChevronLeft size={18} className="text-[var(--muted-foreground)]" />
          </button>
        )}
        <div className="flex gap-1 flex-1">
          {(["dms", "comments"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setSelectedId(null) }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mode === m ? IG_GRADIENT_CSS + " text-white" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {m === "dms" ? <MessageSquare size={12} /> : <Hash size={12} />}
              {m === "dms" ? "DMs" : "Comentarios"}
            </button>
          ))}
        </div>
        {mode === "dms" && (
          <button onClick={() => void sync()} disabled={syncing} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        )}
      </div>

      {/* DMs mode */}
      {mode === "dms" && !selectedId && (
        <div className="divide-y divide-[var(--border)]">
          {convsState.status === "loading" && (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-[var(--muted)] rounded-xl animate-pulse" />)}
            </div>
          )}
          {convsState.status === "ok" && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
              <MessageCircle size={32} className="mb-3 opacity-40" />
              <p className="text-sm">No hay mensajes aún</p>
              <p className="text-xs mt-1">Sincronizá para cargar DMs</p>
            </div>
          )}
          {conversations.map((conv) => {
            const open = isWindowOpen(conv)
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.conversationId)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--muted)]/30 transition-colors text-left"
              >
                <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold ${conv.unreadCount > 0 ? IG_GRADIENT_CSS + " text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                  {conv.participantPic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conv.participantPic} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    (conv.participantUsername || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${conv.unreadCount > 0 ? "font-bold text-[var(--foreground)]" : "font-medium text-[var(--foreground)]"}`}>
                      @{conv.participantUsername || conv.participantId}
                    </span>
                    {conv.lastMessageAt && <span className="text-[11px] text-[var(--muted-foreground)]">{timeAgo(conv.lastMessageAt)}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: open ? "#16a34a" : "var(--muted-foreground)" }} />
                    <span className="text-xs text-[var(--muted-foreground)]">{open ? "Ventana abierta" : "Ventana cerrada"}</span>
                    {conv.unreadCount > 0 && (
                      <span className={`ml-auto text-[10px] text-white font-bold px-1.5 py-0.5 rounded-full ${IG_GRADIENT_CSS}`}>
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* DMs thread */}
      {mode === "dms" && selectedId && (
        <div className="flex flex-col h-[420px]">
          {selectedConv && (
            <div className="px-4 py-3 flex items-center gap-3 border-b border-[var(--border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm font-bold text-[var(--muted-foreground)] flex-shrink-0">
                {(selectedConv.participantUsername || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">@{selectedConv.participantUsername || selectedConv.participantId}</p>
                <span className="text-xs text-[var(--muted-foreground)]">{windowOpen ? "Ventana abierta" : "Ventana cerrada"}</span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {threadState.status === "loading" && (
              <div className="flex items-center justify-center h-full"><Loader2 size={20} className="animate-spin text-[var(--muted-foreground)]" /></div>
            )}
            {threadState.status === "ok" && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2"><p className="text-sm text-[var(--muted-foreground)]">Sin mensajes</p></div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isFromBusiness ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm ${msg.isFromBusiness ? IG_GRADIENT_CSS + " text-white rounded-br-sm" : "bg-[var(--muted)] rounded-bl-sm text-[var(--foreground)]"}`}>
                  <p className="whitespace-pre-wrap break-words">{msg.text || <span className="italic opacity-60">multimedia</span>}</p>
                  <p className="text-[10px] mt-1 text-right opacity-70">{timeAgo(msg.timestamp)}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {!windowOpen && (
            <div className="mx-3 mb-2 px-3 py-2 rounded-lg flex items-center gap-2 bg-[var(--muted)] border border-[var(--border)]">
              <Clock size={13} className="text-[var(--muted-foreground)] flex-shrink-0" />
              <p className="text-xs text-[var(--muted-foreground)]">La ventana de 24h está cerrada. El usuario debe enviarte un mensaje primero.</p>
            </div>
          )}

          <div className="p-3 border-t border-[var(--border)]">
            {sendError && <p className="text-xs text-red-500 mb-1 px-1">{sendError}</p>}
            <div className="flex items-center gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) void handleSend() }}
                placeholder={windowOpen ? "Mensaje… (Enter para enviar)" : "Ventana cerrada"}
                disabled={!windowOpen}
                className="flex-1 bg-[var(--muted)] rounded-full px-4 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none border border-[var(--border)] focus:border-[var(--muted-foreground)] transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => void handleSend()}
                disabled={!reply.trim() || !windowOpen}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-50 ${reply.trim() && windowOpen ? IG_GRADIENT_CSS : "bg-[var(--muted)]"}`}
              >
                <Send size={14} className={reply.trim() && windowOpen ? "text-white" : "text-[var(--muted-foreground)]"} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments mode */}
      {mode === "comments" && (
        <div>
          {!selectedMediaId ? (
            <div className="p-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-3">Elegí un reel para ver y responder sus comentarios:</p>
              <div className="grid grid-cols-4 gap-[3px]">
                {reels.slice(0, 12).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedMediaId(r.instagramId); void comments.fetchComments(r.instagramId) }}
                    className="relative aspect-square bg-[var(--muted)] overflow-hidden rounded-md"
                  >
                    {r.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute bottom-1 right-1 text-[10px] font-bold text-white drop-shadow flex items-center gap-0.5">
                      <MessageCircle size={9} fill="white" />{r.commentsCount}
                    </span>
                  </button>
                ))}
              </div>
              {reels.length === 0 && <p className="text-center text-sm text-[var(--muted-foreground)] py-8">Sincronizá tu cuenta para ver reels</p>}
            </div>
          ) : (
            <div>
              <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2">
                <button onClick={() => setSelectedMediaId(null)}><ChevronLeft size={16} className="text-[var(--muted-foreground)]" /></button>
                <span className="text-sm font-medium text-[var(--foreground)]">Comentarios</span>
              </div>
              <div className="divide-y divide-[var(--border)] max-h-[380px] overflow-y-auto">
                {comments.state.status === "loading" && (
                  <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin text-[var(--muted-foreground)]" /></div>
                )}
                {comments.state.status === "ok" && comments.state.comments.length === 0 && (
                  <p className="text-center text-sm text-[var(--muted-foreground)] py-10">Sin comentarios</p>
                )}
                {comments.state.status === "ok" &&
                  comments.state.comments.map((c) => (
                    <div key={c.id} className={`px-4 py-3 ${c.hidden ? "opacity-40" : ""} ${c.parentId ? "pl-10 bg-[var(--muted)]/20" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-[var(--foreground)]">
                            <span className="font-semibold">@{c.username}</span> {c.text}
                          </p>
                          <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{timeAgo(c.timestamp)} · {c.likeCount} likes</p>
                        </div>
                        {!c.hidden && (
                          <button
                            onClick={() => void comments.hideComment(c.id)}
                            title="Ocultar"
                            className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <EyeOff size={13} />
                          </button>
                        )}
                      </div>
                      {!c.parentId && (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            placeholder="Responder…"
                            value={comments.currentMediaId === selectedMediaId ? replyText : ""}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter" && replyText.trim()) {
                                await comments.postReply(c.igCommentId, replyText.trim())
                                setReplyText("")
                              }
                            }}
                            className="flex-1 bg-[var(--muted)] rounded-full px-3 py-1.5 text-xs text-[var(--foreground)] outline-none border border-[var(--border)]"
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
