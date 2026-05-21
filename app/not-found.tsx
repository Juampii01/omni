import Link from "next/link"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <html lang="es">
      <body className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center text-center gap-5 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <FileQuestion className="h-7 w-7 text-muted-foreground" />
          </div>

          <div className="space-y-1.5">
            <p className="text-5xl font-bold text-muted-foreground/20 tracking-tight">404</p>
            <h1 className="text-lg font-semibold">Página no encontrada</h1>
            <p className="text-sm text-muted-foreground">
              La URL que ingresaste no existe.
            </p>
          </div>

          <Link
            href="/login"
            className="text-sm font-medium text-brand hover:underline"
          >
            Ir al login →
          </Link>
        </div>
      </body>
    </html>
  )
}
