import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Music2 } from "lucide-react"

export const metadata = { title: "TikTok" }

export default function TikTokPage() {
  return (
    <ComingSoon
      icon={Music2}
      title="Integración con TikTok"
      description="Performance de tus videos, audiencia y engagement automatizado. Seguí el crecimiento de tu canal y detectá tendencias al instante."
      availableIn="Septiembre 2026"
    />
  )
}
