import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Youtube } from "lucide-react"

export const metadata = { title: "YouTube" }

export default function YouTubePage() {
  return (
    <ComingSoon
      icon={Youtube}
      title="Integración con YouTube"
      description="Suscriptores, views, watch time y revenue de tu canal directamente en tu dashboard. Analizá qué contenido convierte mejor."
      availableIn="Octubre 2026"
    />
  )
}
