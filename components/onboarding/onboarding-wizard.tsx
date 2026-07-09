"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence, type Variants } from "motion/react"
import { toast } from "sonner"
import { Check, ArrowRight, ArrowLeft } from "lucide-react"
import { fetchWithAuth } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Layer = "framework" | "vocabulario" | "casos"
type KnowledgeEntry = { id: string; layer: Layer; title: string; content: string }

const LAYERS: Array<{ key: Layer; label: string; hint: string }> = [
  { key: "framework", label: "Principios / framework", hint: "Reglas concretas de cómo debería operar este negocio." },
  { key: "vocabulario", label: "Vocabulario y estilo", hint: "La forma de hablar característica de la metodología." },
  { key: "casos", label: "Casos de referencia", hint: "Ejemplos reales de qué salió bien y qué salió mal." },
]

const CONTEXT_TABS = [
  { key: "ubicacion", label: "Ubicación / cuenta" },
  { key: "sobre_vos", label: "Sobre vos" },
  { key: "negocio", label: "Sobre tu negocio" },
  { key: "numeros", label: "Los números" },
  { key: "cliente_ideal", label: "Tu cliente ideal" },
  { key: "contenido", label: "Contenido / audiencia" },
  { key: "como_llegaste", label: "Cómo llegaste acá" },
] as const

const STEP_LABELS = ["Identidad", "Mentor", "Negocio", "Listo"]

const slideVariants: Variants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
}

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [businessName, setBusinessName] = useState("")
  const [mentorName, setMentorName] = useState("")
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([])
  const [contextData, setContextData] = useState<Record<string, string>>({})
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [layerDrafts, setLayerDrafts] = useState<Record<Layer, { title: string; content: string }>>({
    framework: { title: "", content: "" },
    vocabulario: { title: "", content: "" },
    casos: { title: "", content: "" },
  })

  useEffect(() => {
    Promise.all([
      fetchWithAuth("/api/omni/mentor").then((r) => r.json()),
      fetchWithAuth("/api/omni/context").then((r) => r.json()),
    ]).then(([mentorData, contextRes]) => {
      const name = mentorData.businessName ?? ""
      const mentor = mentorData.mentorName ?? ""
      const entries: KnowledgeEntry[] = mentorData.knowledge ?? []
      setBusinessName(name)
      setMentorName(mentor)
      setKnowledge(entries)
      setContextData(contextRes.context ?? {})

      const layersCovered = new Set(entries.map((k) => k.layer))
      const identityDone = !!name.trim() && !!mentor.trim()
      const mentorDone = LAYERS.every((l) => layersCovered.has(l.key))
      setStep(!identityDone ? 0 : !mentorDone ? 1 : 2)
      setLoading(false)
    })
  }, [])

  const layersCovered = useMemo(() => new Set(knowledge.map((k) => k.layer)), [knowledge])
  const mentorStepComplete = LAYERS.every((l) => layersCovered.has(l.key))

  async function saveIdentity() {
    if (!businessName.trim() || !mentorName.trim()) return
    setSavingIdentity(true)
    const res = await fetchWithAuth("/api/omni/mentor", { method: "PUT", body: JSON.stringify({ businessName, mentorName }) })
    setSavingIdentity(false)
    if (!res.ok) {
      toast.error("No se pudo guardar")
      return
    }
    setStep(1)
  }

  async function addLayerEntry(layer: Layer) {
    const draft = layerDrafts[layer]
    if (!draft.title.trim() || !draft.content.trim()) return
    const res = await fetchWithAuth("/api/omni/mentor/knowledge", {
      method: "POST",
      body: JSON.stringify({ layer, title: draft.title, content: draft.content }),
    })
    const data = await res.json()
    if (!data.entry) {
      toast.error(data.error ?? "No se pudo agregar")
      return
    }
    setKnowledge((prev) => [...prev, data.entry])
    setLayerDrafts((prev) => ({ ...prev, [layer]: { title: "", content: "" } }))
  }

  async function finish() {
    setFinishing(true)
    await fetchWithAuth("/api/omni/context", { method: "PUT", body: JSON.stringify({ context: contextData }) })
    setFinishing(false)
    setStep(3)
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Cargando…</div>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex items-center justify-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEP_LABELS.length - 1 && <div className={`h-px w-8 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
            {step === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-xl">Contale a Omni quién sos</CardTitle>
                  <CardDescription>Esto define cómo Omni se presenta y a quién representa en cada respuesta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Nombre del negocio</label>
                    <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1" placeholder="Ej: Coaching de Ana" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Nombre del mentor</label>
                    <Input value={mentorName} onChange={(e) => setMentorName(e.target.value)} className="mt-1" placeholder="Ej: Ana" />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-xl">El criterio del mentor</CardTitle>
                  <CardDescription>
                    Al menos una entrada por capa — es lo mínimo que Omni necesita para responder con criterio real, no genérico.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {LAYERS.map((l) => {
                    const done = layersCovered.has(l.key)
                    return (
                      <div key={l.key} className="rounded-xl border border-border/60 p-3">
                        <div className="flex items-center gap-2">
                          {done && <Check className="h-4 w-4 text-primary" />}
                          <p className="text-sm font-medium">{l.label}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{l.hint}</p>
                        {done ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {knowledge.filter((k) => k.layer === l.key).length} entrada(s) cargada(s).
                          </p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            <Input
                              placeholder="Título"
                              value={layerDrafts[l.key].title}
                              onChange={(e) => setLayerDrafts((prev) => ({ ...prev, [l.key]: { ...prev[l.key], title: e.target.value } }))}
                            />
                            <Textarea
                              placeholder="Contenido"
                              rows={2}
                              value={layerDrafts[l.key].content}
                              onChange={(e) => setLayerDrafts((prev) => ({ ...prev, [l.key]: { ...prev[l.key], content: e.target.value } }))}
                            />
                            <Button size="sm" variant="secondary" onClick={() => addLayerEntry(l.key)}>
                              Agregar
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-xl">Sobre tu negocio</CardTitle>
                  <CardDescription>
                    Opcional — alimenta mejor la generación de ideas de contenido. Podés completarlo después desde Context Room.
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-96 space-y-3 overflow-y-auto">
                  {CONTEXT_TABS.map((tab) => (
                    <div key={tab.key}>
                      <label className="text-xs text-muted-foreground">{tab.label}</label>
                      <Textarea
                        rows={2}
                        className="mt-1"
                        value={contextData[tab.key] ?? ""}
                        onChange={(e) => setContextData((prev) => ({ ...prev, [tab.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-heading text-xl">Listo</p>
                  <p className="text-sm text-muted-foreground">Omni ya tiene lo que necesita para razonar sobre tu negocio.</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between">
          {step > 0 && step < 3 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4" /> Atrás
            </Button>
          ) : (
            <div />
          )}
          {step === 0 && (
            <Button onClick={saveIdentity} disabled={savingIdentity || !businessName.trim() || !mentorName.trim()}>
              {savingIdentity ? "Guardando…" : "Siguiente"} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 1 && (
            <Button onClick={() => setStep(2)} disabled={!mentorStepComplete}>
              Siguiente <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={finish} disabled={finishing}>
              {finishing ? "Guardando…" : "Finalizar"} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={onComplete}>
              Ir al dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
