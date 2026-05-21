"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const THROTTLE_MS = 15 * 60 * 1000 // 15 minutos

export function LastSeenUpdater({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return
    const key = `omni_last_seen_${userId}`
    const lastUpdate = localStorage.getItem(key)
    const now = Date.now()
    if (lastUpdate && now - Number(lastUpdate) < THROTTLE_MS) return

    localStorage.setItem(key, String(now))
    const supabase = createClient() as any
    supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId)
      .then() // fire and forget
  }, [userId])

  return null
}
