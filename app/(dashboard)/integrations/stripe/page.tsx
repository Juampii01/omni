import { ComingSoon } from "@/components/placeholder/coming-soon"
import { CreditCard } from "lucide-react"

export const metadata = { title: "Stripe" }

export default function StripePage() {
  return (
    <ComingSoon
      icon={CreditCard}
      title="Integración con Stripe"
      description="Sincronizá pagos, suscripciones y revenue de Stripe con tu dashboard. MRR, churn y LTV actualizados automáticamente desde tu cuenta."
      availableIn="Agosto 2026"
    />
  )
}
