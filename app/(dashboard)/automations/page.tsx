import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Zap } from "lucide-react"

export const metadata = { title: "Automatizaciones" }

export default function AutomationsPage() {
  return (
    <ComingSoon
      icon={Zap}
      title="Automatizaciones"
      description="Workflows activos, webhooks, cron jobs, conexiones a Zapier/n8n/Make, AI workflows con prompts guardados y logs de ejecución."
      badge="En construcción — Fase 2"
    />
  )
}
