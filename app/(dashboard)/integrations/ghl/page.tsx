import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Zap } from "lucide-react"

export const metadata = { title: "GoHighLevel" }

export default function GHLPage() {
  return (
    <ComingSoon
      icon={Zap}
      title="Integración con GoHighLevel"
      description="Conectá tu CRM externo para sincronizar contactos, contratos y pagos automáticamente. Los leads de GHL aparecen en Omni en tiempo real."
      availableIn="Julio 2026"
    />
  )
}
