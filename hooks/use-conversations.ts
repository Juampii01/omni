"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

export interface Conversation {
  id:         string
  title:      string | null
  updated_at: string
  created_at: string
}

async function fetchConversations(): Promise<Conversation[]> {
  const sb = createClient() as any
  const { data } = await sb
    .from("ai_conversations")
    .select("id, title, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(50)

  return (data as Conversation[]) ?? []
}

export function useConversations() {
  const { data, mutate, isLoading } = useSWR<Conversation[]>(
    "ai-conversations",
    fetchConversations,
    {
      revalidateOnFocus: false,
      dedupingInterval:  10_000,
      fallbackData:      [],
    }
  )

  return {
    conversations: data ?? [],
    isLoading,
    /** Re-fetch conversation list */
    refresh: () => mutate(),
  }
}
