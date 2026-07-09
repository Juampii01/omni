"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SetupPage() {
  const router = useRouter()
  const [clientName, setClientName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ownerPassword, setOwnerPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch("/api/setup/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName, ownerEmail, ownerPassword }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? "Error desconocido")
      return
    }
    router.replace("/login")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Setup inicial de Omni</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea el primer cliente y su usuario owner. Solo funciona una vez.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="h-11 w-full rounded-lg border px-3 text-sm"
            placeholder="Nombre del cliente/negocio"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
          />
          <input
            className="h-11 w-full rounded-lg border px-3 text-sm"
            placeholder="Email del owner"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
          />
          <input
            className="h-11 w-full rounded-lg border px-3 text-sm"
            placeholder="Contraseña (mín. 8 caracteres)"
            type="password"
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-foreground text-sm font-semibold text-background disabled:opacity-50"
          >
            {loading ? "Creando…" : "Crear cliente"}
          </button>
        </form>
      </div>
    </div>
  )
}
