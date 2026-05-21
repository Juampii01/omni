"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = "text" | "textarea" | "choice" | "rating"

type Question = {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  required: boolean
}

type DiscoveryForm = {
  id: string
  title: string
  description: string | null
  questions: Question[]
}

// ── Rating buttons ────────────────────────────────────────────────────────────

function RatingInput({
  questionId,
  value,
  onChange,
}: {
  questionId: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(String(n))}
          className={cn(
            "h-11 w-11 rounded-lg border text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring",
            value === String(n)
              ? "border-brand bg-brand text-brand-foreground shadow"
              : "border-border hover:border-brand/60 hover:bg-muted"
          )}
        >
          {n}
        </button>
      ))}
      {value && (
        <span className="self-center text-xs text-muted-foreground">
          {value === "1" && "Muy malo"}
          {value === "2" && "Malo"}
          {value === "3" && "Regular"}
          {value === "4" && "Bueno"}
          {value === "5" && "Excelente"}
        </span>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function RespondClient({ form }: { form: DiscoveryForm }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate required questions
    for (const q of form.questions) {
      if (q.required && !answers[q.id]?.trim()) {
        toast.error(`La pregunta "${q.question.slice(0, 60)}" es requerida`)
        return
      }
    }

    setSubmitting(true)
    const supabase = createClient() as any
    const { error } = await supabase.from("discovery_responses").insert({
      form_id: form.id,
      respondent_name: name.trim() || null,
      respondent_email: email.trim() || null,
      answers,
      completed_at: new Date().toISOString(),
    })

    setSubmitting(false)
    if (error) {
      toast.error("No se pudo enviar el formulario. Intentá de nuevo.")
      return
    }
    setSubmitted(true)
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Toaster richColors position="bottom-right" />
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">¡Gracias!</h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Tus respuestas fueron enviadas correctamente.
            Nos pondremos en contacto a la brevedad.
          </p>
        </div>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="bottom-right" />

      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold leading-snug">{form.title}</h1>
          {form.description && (
            <p className="text-muted-foreground mt-3 text-sm sm:text-base leading-relaxed">
              {form.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Respondent info */}
          <div className="p-5 rounded-xl border border-border bg-muted/20 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tus datos (opcional)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="respondent-name">Nombre</Label>
                <Input
                  id="respondent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan García"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="respondent-email">Email</Label>
                <Input
                  id="respondent-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@empresa.com"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {form.questions.map((q, idx) => (
              <div key={q.id} className="space-y-2.5">
                <Label className="text-sm font-medium leading-snug">
                  <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>
                  {q.question}
                  {q.required && (
                    <span className="text-destructive ml-1" aria-label="requerida">*</span>
                  )}
                </Label>

                {q.type === "text" && (
                  <Input
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Tu respuesta…"
                  />
                )}

                {q.type === "textarea" && (
                  <Textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Tu respuesta…"
                    rows={4}
                  />
                )}

                {q.type === "choice" && q.options && (
                  <div className="space-y-2">
                    {q.options.map((option) => (
                      <label
                        key={option}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors",
                          answers[q.id] === option
                            ? "border-brand bg-brand-soft"
                            : "border-border hover:bg-muted/40"
                        )}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={option}
                          checked={answers[q.id] === option}
                          onChange={() => setAnswer(q.id, option)}
                          className="accent-[hsl(var(--brand))] h-4 w-4 flex-shrink-0"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === "rating" && (
                  <RatingInput
                    questionId={q.id}
                    value={answers[q.id] ?? ""}
                    onChange={(v) => setAnswer(q.id, v)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto bg-brand hover:bg-brand-hover"
              size="lg"
            >
              {submitting ? "Enviando…" : "Enviar respuestas"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Los campos con <span className="text-destructive">*</span> son obligatorios.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
