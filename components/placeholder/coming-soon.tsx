import { Button } from "@/components/ui/button"
import { Clock, Bell } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface ComingSoonProps {
  icon: LucideIcon
  title: string
  description: string
  availableIn: string
}

export function ComingSoon({ icon: Icon, title, description, availableIn }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-brand-soft flex items-center justify-center mx-auto">
          <Icon className="w-10 h-10 text-brand" />
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="text-muted-foreground mt-2 leading-relaxed">{description}</p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-soft text-brand rounded-full text-sm font-medium">
          <Clock className="w-4 h-4" />
          Disponible en {availableIn}
        </div>

        <div className="pt-2">
          <Button variant="outline" className="gap-2">
            <Bell className="w-4 h-4" />
            Notificarme cuando esté listo
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Mientras tanto, podés gestionar todo desde el sistema interno de Omni.
        </p>
      </div>
    </div>
  )
}
