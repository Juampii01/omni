"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const TOAST_THROTTLE_MS = 3_000

/**
 * Wraps local task state with a Supabase Realtime subscription.
 * Drop-in replacement for `useState<Task[]>(initialTasks)`.
 *
 * Handles:
 *  - INSERT  → prepends new task (if not soft-deleted)
 *  - UPDATE  → updates in-place; removes if `deleted_at` is set
 *  - DELETE  → removes from state
 */
export function useRealtimeTasks<T extends { id: string; deleted_at?: string | null }>(
  initialTasks: T[],
  channelName = "realtime-tasks",
): {
  tasks:    T[]
  setTasks: React.Dispatch<React.SetStateAction<T[]>>
} {
  const [tasks, setTasks]   = useState<T[]>(initialTasks)
  const lastToastRef        = useRef<number>(0)

  // Keep state in sync when server re-fetches
  useEffect(() => { setTasks(initialTasks) }, [initialTasks])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sb = createClient()

    function throttledToast(msg: string) {
      const now = Date.now()
      if (now - lastToastRef.current > TOAST_THROTTLE_MS) {
        lastToastRef.current = now
        toast(msg, { duration: 2_000, position: "bottom-right" })
      }
    }

    const channel = sb
      .channel(channelName)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "tasks" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const { eventType, new: newRow, old: oldRow } = payload

          if (eventType === "INSERT") {
            if (!newRow?.deleted_at) {
              setTasks(prev =>
                prev.some(t => t.id === newRow.id) ? prev : [newRow as T, ...prev]
              )
              throttledToast("Nueva tarea agregada")
            }
          } else if (eventType === "UPDATE") {
            if (newRow?.deleted_at) {
              setTasks(prev => prev.filter(t => t.id !== newRow.id))
              throttledToast("Tarea eliminada")
            } else {
              setTasks(prev =>
                prev.map(t => t.id === newRow.id ? { ...t, ...newRow } : t)
              )
              throttledToast("Tarea actualizada")
            }
          } else if (eventType === "DELETE") {
            setTasks(prev => prev.filter(t => t.id !== oldRow?.id))
          }
        }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [channelName])

  return { tasks, setTasks }
}
