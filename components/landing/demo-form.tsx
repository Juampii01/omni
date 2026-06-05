"use client"

import { useState, type CSSProperties } from "react"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

type Status = "idle" | "loading" | "success" | "error"
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputStyle: CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,.025)",
  border: "1px solid var(--line-strong)",
  borderRadius: 12,
  padding: "12px 15px",
  color: "var(--ink)",
  fontFamily: "var(--sans)",
  fontSize: 15,
  outline: "none",
}
const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 7,
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "var(--ink-faint)",
}

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
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(68,240,140,.28)",
          background: "linear-gradient(120deg,rgba(68,240,140,.1),rgba(68,240,140,.02))",
          padding: 40,
          textAlign: "center",
        }}
      >
        <CheckCircle2 size={34} style={{ color: "var(--green)", margin: "0 auto 14px" }} />
        <div style={{ fontFamily: "var(--serif)", fontSize: 24, color: "var(--ink)" }}>¡Listo! Te contactamos.</div>
        <p style={{ marginTop: 10, fontSize: 14.5, color: "var(--ink-dim)" }}>
          Recibimos tu solicitud de demo. Te escribimos al email que dejaste para coordinar.
        </p>
      </div>
    )
  }

  const loading = status === "loading"

  return (
    <form
      onSubmit={onSubmit}
      style={{
        borderRadius: 18,
        border: "1px solid var(--line-strong)",
        background: "linear-gradient(180deg,rgba(18,24,21,.7),rgba(7,10,9,.6))",
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={labelStyle}>Nombre *</label>
          <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} disabled={loading} placeholder="Tu nombre" />
        </div>
        <div>
          <label style={labelStyle}>Email *</label>
          <input style={inputStyle} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} disabled={loading} placeholder="tu@email.com" />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Empresa</label>
        <input style={inputStyle} value={form.company} onChange={(e) => set("company", e.target.value)} disabled={loading} placeholder="Tu empresa (opcional)" />
      </div>
      <div>
        <label style={labelStyle}>Mensaje</label>
        <textarea
          style={{ ...inputStyle, resize: "none" }}
          rows={3}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          disabled={loading}
          placeholder="Contanos brevemente sobre tu negocio (opcional)"
        />
      </div>

      {status === "error" && error && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            borderRadius: 10,
            border: "1px solid rgba(248,113,113,.25)",
            background: "rgba(248,113,113,.08)",
            padding: "9px 12px",
            fontSize: 13,
            color: "#fca5a5",
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          height: 50,
          borderRadius: 999,
          border: "none",
          cursor: loading ? "default" : "pointer",
          background: "var(--green)",
          color: "#04150b",
          fontFamily: "var(--sans)",
          fontWeight: 600,
          fontSize: 15.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          opacity: loading ? 0.7 : 1,
          boxShadow: "0 0 0 1px rgba(68,240,140,.5),0 10px 32px -10px rgba(68,240,140,.6)",
        }}
      >
        {loading ? (
          <>
            <Loader2 size={17} className="animate-spin" /> Enviando…
          </>
        ) : (
          "Agendá una demo"
        )}
      </button>
      <p style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", letterSpacing: ".03em" }}>
        Te contactamos para coordinar. Sin compromiso.
      </p>
    </form>
  )
}
