"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

interface AiCredits {
  used:            number
  limit:           number
  percentage:      number   // 0-100
  isLimitReached:  boolean
  isWarning:       boolean  // true when >= 90%
}

async function fetchCredits(): Promise<AiCredits> {
  const sb = createClient() as any
  const { data } = await sb
    .from("client_settings")
    .select("ai_credits_used, ai_credits_limit")
    .single()

  const used  = data?.ai_credits_used  ?? 0
  const limit = data?.ai_credits_limit ?? 100_000

  const percentage     = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const isLimitReached = used >= limit
  const isWarning      = percentage >= 90

  return { used, limit, percentage, isLimitReached, isWarning }
}

export function useAiCredits() {
  const { data, mutate, isLoading } = useSWR<AiCredits>("ai-credits", fetchCredits, {
    revalidateOnFocus: false,
    dedupingInterval:  30_000,    // re-fetch at most every 30s
    fallbackData: {
      used: 0, limit: 100_000,
      percentage: 0, isLimitReached: false, isWarning: false,
    },
  })

  return {
    ...(data as AiCredits),
    isLoading,
    /** Call after each AI message to sync the counter */
    refresh: () => mutate(),
  }
}
