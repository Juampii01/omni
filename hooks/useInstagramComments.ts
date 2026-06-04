"use client"

import { useState, useCallback } from "react"

export interface InstagramComment {
  id: string
  igCommentId: string
  username: string
  text: string
  timestamp: string
  likeCount: number
  hidden: boolean
  parentId: string | null
}

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; comments: InstagramComment[] }
  | { status: "error"; message: string }

export function useInstagramComments() {
  const [state, setState] = useState<FetchState>({ status: "idle" })
  const [currentMediaId, setCurrentMediaId] = useState<string | null>(null)
  const [replyState, setReplyState] = useState<"idle" | "loading" | "error">("idle")
  const [hideState, setHideState] = useState<"idle" | "loading" | "error">("idle")

  const fetchComments = useCallback(async (igMediaId: string) => {
    setState({ status: "loading" })
    setCurrentMediaId(igMediaId)
    try {
      const res = await fetch(`/api/instagram/comments?mediaId=${encodeURIComponent(igMediaId)}`)
      const json = await res.json()
      if (!res.ok) {
        setState({ status: "error", message: json.error ?? "Error desconocido" })
        return
      }
      setState({ status: "ok", comments: (json.comments ?? []) as InstagramComment[] })
    } catch (e) {
      setState({ status: "error", message: String(e) })
    }
  }, [])

  const postReply = useCallback(async (commentId: string, message: string): Promise<boolean> => {
    setReplyState("loading")
    try {
      const res = await fetch("/api/instagram/comments/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, message }),
      })
      if (!res.ok) {
        setReplyState("error")
        return false
      }
      setReplyState("idle")
      // refrescar la media actual
      if (currentMediaId) await fetchComments(currentMediaId)
      return true
    } catch {
      setReplyState("error")
      return false
    }
  }, [currentMediaId, fetchComments])

  const hideComment = useCallback(async (internalId: string): Promise<boolean> => {
    setHideState("loading")
    try {
      const res = await fetch(`/api/instagram/comments/${internalId}`, { method: "DELETE" })
      if (!res.ok) {
        setHideState("error")
        return false
      }
      setState((prev) =>
        prev.status === "ok"
          ? { ...prev, comments: prev.comments.map((c) => (c.id === internalId ? { ...c, hidden: true } : c)) }
          : prev,
      )
      setHideState("idle")
      return true
    } catch {
      setHideState("error")
      return false
    }
  }, [])

  return { state, currentMediaId, replyState, hideState, fetchComments, postReply, hideComment }
}
