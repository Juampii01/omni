"use client"

import { Camera, Zap, BarChart3, MessageCircle, Image } from "lucide-react"
import { IG_GRADIENT_CSS } from "./ig-theme"
import { useSocialConnection } from "@/hooks/useSocialConnection"

const FEATURES = [
  { icon: BarChart3, label: "Analytics en tiempo real", desc: "Views, reach, saves, shares por post" },
  { icon: Image, label: "Gestión de contenido", desc: "Grilla completa con métricas overlaid" },
  { icon: MessageCircle, label: "Inbox unificado", desc: "DMs + comentarios en un solo lugar" },
  { icon: Zap, label: "Publicación directa", desc: "Publicá reels e imágenes desde el dashboard" },
]

export function IGNotConnected({ onConnect }: { onConnect?: () => void }) {
  const { connect, loading: connecting } = useSocialConnection("instagram", {})

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
      <div className={`w-20 h-20 rounded-[22px] ${IG_GRADIENT_CSS} flex items-center justify-center mb-6 shadow-2xl`}>
        <Camera className="w-10 h-10 text-white" strokeWidth={1.5} />
      </div>

      <h2 className="text-3xl font-bold text-[var(--foreground)] mb-2 text-center">Conectá tu Instagram</h2>
      <p className="text-[var(--muted-foreground)] text-center max-w-sm mb-10 text-base leading-relaxed">
        Accedé a analytics profesionales, publicá contenido y gestioná tu engagement — todo desde acá.
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-md w-full mb-10">
        {FEATURES.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <div className={`w-9 h-9 rounded-xl ${IG_GRADIENT_CSS} flex items-center justify-center mb-3`}>
              <Icon className="w-4.5 h-4.5 text-white" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-[var(--foreground)] mb-0.5">{label}</p>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          connect()
          onConnect?.()
        }}
        disabled={connecting}
        className={`h-12 px-8 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-60 ${IG_GRADIENT_CSS} shadow-lg`}
      >
        {connecting ? "Conectando…" : "Conectar con Instagram"}
      </button>

      <p className="mt-4 text-xs text-[var(--muted-foreground)] text-center max-w-xs">
        Usamos la API oficial de Meta. Tu contraseña nunca se comparte.
      </p>
    </div>
  )
}
