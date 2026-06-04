"use client"

import { useState, useEffect } from "react"

export interface GenderAgeData {
  label: string // ej: "F 18-24"
  value: number
  gender: "F" | "M" | "U"
  ageRange: string
}

export interface CountryData {
  code: string
  value: number
  pct: number
}

export interface CityData {
  name: string
  value: number
  pct: number
}

export interface HistoryPoint {
  date: string
  value: number
}

export interface AudienceDemographics {
  cached: boolean
  date: string
  genderAge: GenderAgeData[]
  country: CountryData[]
  city: CityData[]
  followerHistory: HistoryPoint[]
  reachHistory: HistoryPoint[]
}

type State =
  | { status: "loading" }
  | { status: "ok"; data: AudienceDemographics }
  | { status: "insufficient_followers" }
  | { status: "error"; message: string }

function parseGenderAge(raw: Record<string, number>): GenderAgeData[] {
  return Object.entries(raw)
    .map(([key, value]) => {
      // key viene como "F.18-24" o "M.25-34"
      const [gender, ageRange] = key.split(".")
      const g = gender === "F" ? "F" : gender === "M" ? "M" : "U"
      return {
        label: `${g} ${ageRange ?? ""}`.trim(),
        value,
        gender: g as "F" | "M" | "U",
        ageRange: ageRange ?? "",
      }
    })
    .sort((a, b) => b.value - a.value)
}

function parseTopN(raw: Record<string, number>, n = 5): Array<{ code: string; name: string; value: number; pct: number }> {
  const total = Object.values(raw).reduce((s, v) => s + v, 0)
  return Object.entries(raw)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([key, value]) => ({ code: key, name: key, value, pct: total > 0 ? Math.round((value / total) * 100) : 0 }))
}

export function useAudienceDemographics(): State {
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    fetch("/api/instagram/audience")
      .then(async (res) => {
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          if (res.status === 422 && json.error === "INSUFFICIENT_FOLLOWERS") {
            setState({ status: "insufficient_followers" })
          } else {
            setState({ status: "error", message: json.error ?? "Error desconocido" })
          }
          return
        }
        const raw = json as {
          cached: boolean
          date: string
          genderAge: Record<string, number>
          country: Record<string, number>
          city: Record<string, number>
          followerHistory: HistoryPoint[]
          reachHistory: HistoryPoint[]
        }
        setState({
          status: "ok",
          data: {
            cached: raw.cached,
            date: raw.date,
            genderAge: parseGenderAge(raw.genderAge ?? {}),
            country: parseTopN(raw.country ?? {}, 5) as CountryData[],
            city: parseTopN(raw.city ?? {}, 5) as CityData[],
            followerHistory: raw.followerHistory ?? [],
            reachHistory: raw.reachHistory ?? [],
          },
        })
      })
      .catch((e) => {
        if (!cancelled) setState({ status: "error", message: String(e) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
