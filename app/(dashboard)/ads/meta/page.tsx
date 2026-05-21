import { ComingSoon } from "@/components/placeholder/coming-soon"
import { BarChart2 } from "lucide-react"

export const metadata = { title: "Meta Ads" }

export default function MetaAdsPage() {
  return (
    <ComingSoon
      icon={BarChart2}
      title="Integración con Meta Ads"
      description="Sincronización en tiempo real de tus campañas de Facebook e Instagram Ads. Gasto, CPL, CTR, ROAS y creativos activos de un vistazo."
      availableIn="Agosto 2026"
    />
  )
}
