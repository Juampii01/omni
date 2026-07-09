"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

const TABS = [
  { key: "ubicacion", label: "Ubicación / cuenta", hint: "Dónde estás, tipo de cuenta, plataformas principales." },
  { key: "sobre_vos", label: "Sobre vos", hint: "Quién sos, tu historia, tu experiencia." },
  { key: "negocio", label: "Sobre tu negocio", hint: "Qué vendés, hace cuánto, modelo de negocio." },
  { key: "numeros", label: "Los números", hint: "Facturación, ticket promedio, volumen de clientes." },
  { key: "cliente_ideal", label: "Tu cliente ideal", hint: "A quién le hablás, qué le duele, qué busca." },
  { key: "contenido", label: "Contenido / audiencia", hint: "Qué contenido hacés hoy, tamaño de audiencia." },
  { key: "como_llegaste", label: "Cómo llegaste acá", hint: "Tu camino hasta este negocio." },
] as const

type ContextData = Record<string, string>

export default function ContextPage() {
  const [data, setData] = useState<ContextData>({})
  const [loading, setLoading] = useState(true)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    fetchWithAuth("/api/omni/context")
      .then((r) => r.json())
      .then((d) => {
        setData(d.context ?? {})
        setLoading(false)
      })
  }, [])

  function scheduleSave(next: ContextData, key: string) {
    if (timers.current[key]) clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(async () => {
      const res = await fetchWithAuth("/api/omni/context", {
        method: "PUT",
        body: JSON.stringify({ context: next }),
      })
      if (res.ok) toast.success("Guardado", { duration: 1200 })
      else toast.error("No se pudo guardar")
    }, 800)
  }

  function handleChange(key: string, value: string) {
    const next = { ...data, [key]: value }
    setData(next)
    scheduleSave(next, key)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Context Room</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El perfil de negocio que Omni usa para personalizar ideas y guiones de contenido.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TABS.map((tab) => (
          <Card key={tab.key}>
            <CardHeader>
              <CardTitle className="text-sm">{tab.label}</CardTitle>
              <CardDescription>{tab.hint}</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={data[tab.key] ?? ""}
                onChange={(e) => handleChange(tab.key, e.target.value)}
                rows={4}
                placeholder="Escribí acá…"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
