import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Users } from "lucide-react"

export const metadata = { title: "Clientes" }

export default function ClientsPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Clientes"
      description="CRM operativo del founder. Clientes activos, health score, communication log, Slack channel y pipeline de prospectos."
      badge="En construcción — Fase 2"
    />
  )
}
