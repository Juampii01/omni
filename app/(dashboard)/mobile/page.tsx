import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Smartphone } from "lucide-react"

export const metadata = { title: "App Móvil" }

export default function MobilePage() {
  return (
    <ComingSoon
      icon={Smartphone}
      title="App Móvil de Omni"
      description="Gestioná tu negocio desde tu teléfono. Notificaciones en tiempo real, acceso al CRM, tareas y métricas desde iOS y Android."
      availableIn="Diciembre 2026"
    />
  )
}
