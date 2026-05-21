import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Radio } from "lucide-react"

export const metadata = { title: "Redes Sociales" }

export default function SocialsPage() {
  return (
    <ComingSoon
      icon={Radio}
      title="Redes Sociales"
      description="Conectá Instagram, TikTok y YouTube para ver tus métricas de crecimiento, contenido y audiencia en un solo lugar."
      availableIn="Septiembre 2026"
    />
  )
}
