"use client"

import { createContext, useContext } from "react"
import type { InstagramAccountSummary, UserReelRow } from "@/hooks/useInstagramData"

export interface InstagramDataContextValue {
  connected: boolean
  hasRealData: boolean
  summary: InstagramAccountSummary | null
  reels: UserReelRow[]
  loading: boolean
  hasLoaded: boolean
}

const InstagramDataContext = createContext<InstagramDataContextValue>({
  connected: false,
  hasRealData: false,
  summary: null,
  reels: [],
  loading: true,
  hasLoaded: false,
})

export const InstagramDataProvider = InstagramDataContext.Provider

export function useInstagramDataContext(): InstagramDataContextValue {
  return useContext(InstagramDataContext)
}
