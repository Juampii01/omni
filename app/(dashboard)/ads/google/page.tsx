import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Search } from "lucide-react"

export const metadata = { title: "Google Ads" }

export default function GoogleAdsPage() {
  return (
    <ComingSoon
      icon={Search}
      title="Integración con Google Ads"
      description="Trackeá conversiones, costos y ROI de tus campañas de Google directamente desde Omni. Sin exportar reportes ni cambiar de pestaña."
      availableIn="Agosto 2026"
    />
  )
}
