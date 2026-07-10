"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function redirectByRole(userId: string) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", userId)
      .maybeSingle()
    router.replace((profile as any)?.is_platform_admin ? "/admin" : "/dashboard")
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) redirectByRole(data.session.user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) await redirectByRole(data.session.user.id)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Omni</h1>
          <p className="mt-1 text-sm text-muted-foreground">Iniciá sesión para continuar.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="h-11 w-full rounded-lg border px-3 text-sm"
            placeholder="tu@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="h-11 w-full rounded-lg border px-3 text-sm"
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-foreground text-sm font-semibold text-background disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  )
}
