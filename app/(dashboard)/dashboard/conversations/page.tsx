"use client"

import { AtSign } from "lucide-react"
import { ConnectCard } from "@/components/layout/connect-card"

export default function ConversationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Conversaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">Instagram — DMs de prospección y riesgo de conversión.</p>
      </div>
      <ConnectCard
        icon={AtSign}
        title="Conectá Instagram"
        description="Omni va a leer tus DMs de prospección para detectar conversaciones en riesgo antes de perderlas."
        cta="Conectar Instagram"
      />
    </div>
  )
}
