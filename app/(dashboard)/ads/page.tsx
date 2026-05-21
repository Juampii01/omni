import { ComingSoon } from "@/components/placeholder/coming-soon"
import { BarChart2 } from "lucide-react"

export const metadata = { title: "Publicidad" }

export default function AdsPage() {
  return (
    <ComingSoon
      icon={BarChart2}
      title="Publicidad"
      description="Conectá Meta Ads y Google Ads para ver tus campañas, costos, CPL y ROI en un solo panel sin cambiar de pestaña."
      availableIn="Agosto 2026"
    />
  )
}
