import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Instagram } from "lucide-react"

export const metadata = { title: "Instagram" }

export default function InstagramPage() {
  return (
    <ComingSoon
      icon={Instagram}
      title="Integración con Instagram"
      description="Métricas reales de tus posts, stories y DMs directamente desde Instagram. Reach, impresiones, seguidores y engagement en tiempo real."
      availableIn="Septiembre 2026"
    />
  )
}
