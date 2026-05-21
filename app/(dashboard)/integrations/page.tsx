import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Plug } from "lucide-react"

export const metadata = { title: "Integraciones" }

export default function IntegrationsHubPage() {
  return (
    <ComingSoon
      icon={Plug}
      title="Hub de Integraciones"
      description="Conectá todas tus herramientas: CRMs externos, pasarelas de pago, plataformas de marketing y más. Todo sincronizado automáticamente con Omni."
      availableIn="Julio 2026"
    />
  )
}
