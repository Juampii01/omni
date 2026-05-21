"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RotateCcw } from "lucide-react"
import Link from "next/link"

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AuthError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[Auth Error Boundary]", error)
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-5">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-semibold">Algo salió mal</h2>
          <p className="text-sm text-muted-foreground">
            Ocurrió un error. Por favor intentá de nuevo.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <Button onClick={reset} className="w-full bg-brand hover:bg-brand-hover">
            <RotateCcw className="h-4 w-4 mr-2" />
            Intentar de nuevo
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">Volver al login</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
