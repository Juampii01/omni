"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"
import Link from "next/link"

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: Props) {
  useEffect(() => {
    // Solo loggear en desarrollo
    if (process.env.NODE_ENV === "development") {
      console.error("[Dashboard Error Boundary]", error)
    }
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center gap-5">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">Algo salió mal</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Ocurrió un error inesperado en esta sección. Podés intentar de nuevo o volver al inicio.
            </p>
            {process.env.NODE_ENV === "development" && error?.message && (
              <p className="mt-2 text-[11px] font-mono text-destructive bg-destructive/5 rounded px-3 py-2 text-left break-all">
                {error.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={reset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Intentar de nuevo
            </Button>
            <Button asChild className="flex-1 bg-brand hover:bg-brand-hover">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Ir al inicio
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
