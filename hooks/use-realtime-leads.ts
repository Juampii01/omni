"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

// ── Toast throttle ────────────────────────────────────────────────────────────
// Max 1 realtime toast every 3 seconds (avoids spam on bulk updates)
const TOAST_THROTTLE_MS = 3_000

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Wraps local lead state with a Supabase Realtime subscription.
 * Drop-in replacement for `useState<Lead[]>(initialLeads)`.
 *
 * Handles:
 *  - INSERT  → prepends new lead (if not soft-deleted)
 *  - UPDATE  → updates in-place; removes if `deleted_at` is set (soft delete)
 *  - DELETE  → removes from state
 *
 * @param initialLeads — server-fetched leads (current page)
 * @param channelName  — unique channel name (needed when multiple instances exist)
 */
export function useRealtimeLeads<T extends { id: string; deleted_at?: string | null }>(
  initialLeads: T[],
  channelName = "realtime-leads",
): {
  leads:    T[]
  setLeads: React.Dispatch<React.SetStateAction<T[]>>
} {
  const [leads, setLeads]   = useState<T[]>(initialLeads)
  const lastToastRef        = useRef<number>(0)

  // Keep state in sync when server re-fetches (e.g. page navigation)
  useEffect(() => { setLeads(initialLeads) }, [initialLeads])  // eslint-disable-line react-hooks/exhaustive-deps

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
        { event: "*", schema: "public", table: "leads" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const { eventType, new: newRow, old: oldRow } = payload

          if (eventType === "INSERT") {
            if (!newRow?.deleted_at) {
              setLeads(prev =>
                prev.some(l => l.id === newRow.id) ? prev : [newRow as T, ...prev]
              )
              throttledToast("Nuevo lead agregado")
            }
          } else if (eventType === "UPDATE") {
            if (newRow?.deleted_at) {
              // Soft delete — remove from list
              setLeads(prev => prev.filter(l => l.id !== newRow.id))
              throttledToast("Lead eliminado")
            } else {
              setLeads(prev =>
                prev.map(l => l.id === newRow.id ? { ...l, ...newRow } : l)
              )
              throttledToast("Lead actualizado")
            }
          } else if (eventType === "DELETE") {
            setLeads(prev => prev.filter(l => l.id !== oldRow?.id))
          }
        }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [channelName])

  return { leads, setLeads }
}
