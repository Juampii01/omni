import { ComingSoon } from "@/components/placeholder/coming-soon"
import { Webhook } from "lucide-react"

export const metadata = { title: "Webhooks" }

export default function WebhooksPage() {
  return (
    <ComingSoon
      icon={Webhook}
      title="Webhooks"
      description="Configurá webhooks para recibir datos de cualquier plataforma en tiempo real. Automatizá flujos entre Omni y tus herramientas externas."
      availableIn="Agosto 2026"
    />
  )
}
