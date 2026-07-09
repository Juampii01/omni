"use client"

import { Hash } from "lucide-react"
import { ConnectCard } from "@/components/layout/connect-card"

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Comunidad</h1>
        <p className="mt-1 text-sm text-muted-foreground">Slack — mensajes de comunidad y análisis de Omni.</p>
      </div>
      <ConnectCard
        icon={Hash}
        title="Conectá Slack"
        description="Omni va a leer tus canales para detectar patrones, quejas repetidas y fricción operativa."
        cta="Conectar Slack"
      />
    </div>
  )
}
