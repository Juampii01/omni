import { ComingSoon } from "@/components/placeholder/coming-soon"
import { BrainCircuit } from "lucide-react"

export const metadata = { title: "Inteligencia" }

export default function ResearchPage() {
  return (
    <ComingSoon
      icon={BrainCircuit}
      title="Inteligencia del Negocio"
      description="Investigación de competidores, AI Diagnosis, insights estratégicos y análisis versionados del negocio. Próximamente en Fase 2."
      badge="En construcción — Fase 2"
    />
  )
}
