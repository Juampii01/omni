"use client"

import { useEffect, useState } from "react"
import { HeartPulse } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { formatDayMonthYear } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

type Mood = "genial" | "bien" | "neutral" | "dificil" | "mal"
type Checkin = {
  id: string
  period_label: string | null
  wins: string
  struggles: string
  mood: Mood | null
  created_at: string
}

const MOODS: Array<{ value: Mood; label: string }> = [
  { value: "genial", label: "Genial" },
  { value: "bien", label: "Bien" },
  { value: "neutral", label: "Neutral" },
  { value: "dificil", label: "Difícil" },
  { value: "mal", label: "Mal" },
]

export default function PulsePage() {
  const [checkins, setCheckins] = useState<Checkin[] | null>(null)
  const [periodLabel, setPeriodLabel] = useState("")
  const [wins, setWins] = useState("")
  const [struggles, setStruggles] = useState("")
  const [mood, setMood] = useState<Mood | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetchWithAuth("/api/omni/pulse-checkins")
    const data = await res.json()
    setCheckins(data.items ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmit() {
    if (!wins.trim() && !struggles.trim()) return
    setSaving(true)
    const res = await fetchWithAuth("/api/omni/pulse-checkins", {
      method: "POST",
      body: JSON.stringify({ periodLabel: periodLabel || null, wins, struggles, mood }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo guardar el check-in")
      return
    }
    setCheckins((prev) => [data.checkin, ...(prev ?? [])])
    setPeriodLabel("")
    setWins("")
    setStruggles("")
    setMood(null)
    toast.success("Check-in guardado")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Pulse Check-ins</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wins y luchas del equipo en sus propias palabras — la señal cualitativa que las métricas no capturan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nuevo check-in</CardTitle>
          <CardDescription>Opcional el período — dejalo vacío y se identifica por fecha.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Período (ej: Semana del 21 al 25)" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
          <div>
            <label className="text-xs text-muted-foreground">¿Cómo venís?</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {MOODS.map((m) => (
                <Badge
                  key={m.value}
                  variant={mood === m.value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setMood(mood === m.value ? null : m.value)}
                >
                  {m.label}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Wins</label>
            <Textarea value={wins} onChange={(e) => setWins(e.target.value)} rows={2} className="mt-1" placeholder="Qué salió bien…" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Luchas</label>
            <Textarea value={struggles} onChange={(e) => setStruggles(e.target.value)} rows={2} className="mt-1" placeholder="Con qué estás trabado…" />
          </div>
          <Button onClick={handleSubmit} disabled={saving || (!wins.trim() && !struggles.trim())}>
            {saving ? "Guardando…" : "Guardar check-in"}
          </Button>
        </CardContent>
      </Card>

      {checkins === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : checkins.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <HeartPulse className="h-6 w-6" />
            Todavía no hay check-ins registrados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {checkins.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-sm">
                  {c.period_label || formatDayMonthYear(new Date(c.created_at))}
                </CardTitle>
                {c.mood && <Badge variant="secondary">{MOODS.find((m) => m.value === c.mood)?.label}</Badge>}
              </CardHeader>
              <CardContent className="space-y-2">
                {c.wins && (
                  <p className="text-sm">
                    <span className="font-medium">Wins:</span> <span className="text-muted-foreground">{c.wins}</span>
                  </p>
                )}
                {c.struggles && (
                  <p className="text-sm">
                    <span className="font-medium">Luchas:</span> <span className="text-muted-foreground">{c.struggles}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
