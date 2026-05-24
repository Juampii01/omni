import { ComingSoon } from "@/components/placeholder/coming-soon"
import { BarChart2 } from "lucide-react"

export const metadata = { title: "Métricas" }

export default function MetricsPage() {
  return (
    <ComingSoon
      icon={BarChart2}
      title="Métricas y Finanzas"
      description="Ventas con export a Airtable, Meta Ads, pipeline ManyChat y cashflow mensual. Gráficos con Recharts."
      badge="En construcción — Fase 2"
    />
  )
}
