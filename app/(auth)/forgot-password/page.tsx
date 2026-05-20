"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h2 className="text-xl font-semibold">Revisá tu email</h2>
        <p className="text-sm text-muted-foreground">
          Si existe una cuenta con <strong>{email}</strong>, te enviamos un link para restablecer tu contraseña.
        </p>
        <Link href="/login" className="block text-sm text-brand hover:underline">
          Volver al login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/login"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3 w-3" />
        Volver
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Restablecer contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Ingresá tu email y te enviamos un link
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nombre@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <Button type="submit" className="w-full bg-brand hover:bg-brand-hover" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando…
            </>
          ) : (
            "Enviar link"
          )}
        </Button>
      </form>
    </div>
  )
}
