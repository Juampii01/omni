import { Button } from "@/components/ui/button"
import { FileQuestion, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="flex flex-col items-center text-center gap-5 max-w-sm">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <p className="text-4xl font-bold text-muted-foreground/30 tracking-tight">404</p>
          <h2 className="text-lg font-semibold">Página no encontrada</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            La sección que buscás no existe o fue movida.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="javascript:history.back()">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <Button asChild className="bg-brand hover:bg-brand-hover">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Inicio
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
