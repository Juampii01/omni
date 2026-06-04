"use client"

import { useState, useCallback } from "react"

export interface IGConversation {
  id: string
  conversationId: string
  participantId: string
  participantUsername: string
  participantPic: string
  lastMessageAt: string | null
  lastUserMessageAt: string | null
  unreadCount: number
}

export interface IGMessage {
  id: string
  messageId: string
  fromUsername: string
  text: string
  isFromBusiness: boolean
  timestamp: string
}

type ConvsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; conversations: IGConversation[] }
  | { status: "error"; message: string }

type ThreadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; conversation: IGConversation; messages: IGMessage[] }
  | { status: "error"; message: string }

export function useInstagramMessages() {
  const [convsState, setConvsState] = useState<ConvsState>({ status: "idle" })
  const [threadState, setThreadState] = useState<ThreadState>({ status: "idle" })
  const [sending, setSending] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const loadConversations = useCallback(async () => {
    setConvsState({ status: "loading" })
    try {
      const res = await fetch("/api/instagram/messages")
      const json = await res.json()
      if (!res.ok) {
        setConvsState({ status: "error", message: json.error ?? "Error" })
        return
      }
      setConvsState({ status: "ok", conversations: (json.conversations ?? []) as IGConversation[] })
    } catch (e) {
      setConvsState({ status: "error", message: String(e) })
    }
  }, [])

  const loadThread = useCallback(async (conversationId: string) => {
    setThreadState({ status: "loading" })
    try {
      const res = await fetch(`/api/instagram/messages?conversationId=${encodeURIComponent(conversationId)}`)
      const json = await res.json()
      if (!res.ok) {
        setThreadState({ status: "error", message: json.error ?? "Error" })
        return
      }
      setThreadState({ status: "ok", conversation: json.conversation, messages: json.messages })
    } catch (e) {
      setThreadState({ status: "error", message: String(e) })
    }
  }, [])

  const sendMessage = useCallback(
    async (conversationId: string, text: string): Promise<{ ok: true; message: IGMessage } | { ok: false; error: string }> => {
      setSending(true)
      try {
        const res = await fetch("/api/instagram/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, text }),
        })
        const json = await res.json()
        if (!res.ok) {
          setSending(false)
          return { ok: false, error: json.error ?? "Error desconocido" }
        }
        const msg = json.message as IGMessage
        setThreadState((prev) =>
          prev.status === "ok" && prev.conversation.conversationId === conversationId
            ? { ...prev, messages: [...prev.messages, msg] }
            : prev,
        )
        setSending(false)
        return { ok: true, message: msg }
      } catch (e) {
        setSending(false)
        return { ok: false, error: String(e) }
      }
    },
    [],
  )

  const sync = useCallback(async () => {
    setSyncing(true)
    try {
      await fetch("/api/instagram/messages/sync", { method: "POST" })
      await loadConversations()
    } finally {
      setSyncing(false)
    }
  }, [loadConversations])

  return { convsState, threadState, sending, syncing, loadConversations, loadThread, sendMessage, sync }
}
