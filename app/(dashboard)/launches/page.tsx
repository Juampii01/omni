import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Rocket } from "lucide-react"

export const metadata = { title: "Lanzamientos" }

export default function LaunchesPage() {
  return (
    <ComingSoon
      icon={Rocket}
      title="Lanzamientos"
      description="Portal de lanzamiento con setup por días, lista de participantes, cupones automáticos y stream link de YouTube Live."
      badge="En construcción — Fase 2"
    />
  )
}
