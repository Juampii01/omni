"use client"

import { useState } from "react"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

type Status = "idle" | "loading" | "success" | "error"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function DemoForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" })
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState("")

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Validación client-side (fail fast)
    if (!form.name.trim()) return setError("Ingresá tu nombre.")
    if (!EMAIL_RE.test(form.email.trim())) return setError("Ingresá un email válido.")

    setStatus("loading")
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setStatus("error")
        setError(data.error ?? "No pudimos enviar tu solicitud. Probá de nuevo.")
        return
      }
      setStatus("success")
    } catch {
      setStatus("error")
      setError("Error de red. Revisá tu conexión y probá de nuevo.")
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15">
          <CheckCircle2 className="h-6 w-6 text-brand" />
        </div>
        <h3 className="font-serif text-xl text-foreground">¡Listo! Te contactamos.</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Recibimos tu solicitud de demo. Te escribimos al email que dejaste para coordinar.
        </p>
      </div>
    )
  }

  const loading = status === "loading"

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">Nombre *</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={loading}
            placeholder="Tu nombre"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            disabled={loading}
            placeholder="tu@email.com"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand disabled:opacity-60"
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-muted-foreground">Empresa</label>
        <input
          value={form.company}
          onChange={(e) => set("company", e.target.value)}
          disabled={loading}
          placeholder="Nombre de tu empresa (opcional)"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand disabled:opacity-60"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-muted-foreground">Mensaje</label>
        <textarea
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          disabled={loading}
          rows={3}
          placeholder="Contanos brevemente sobre tu negocio (opcional)"
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand disabled:opacity-60"
        />
      </div>

      {status === "error" && error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Enviando…
          </>
        ) : (
          "Agendá una demo"
        )}
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        Te contactamos para coordinar. Sin compromiso.
      </p>
    </form>
  )
}
