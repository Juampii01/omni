"use client"

import { Grid3X3, MessageCircle, PlusSquare, Home, TrendingUp } from "lucide-react"
import { IG_GRADIENT } from "./ig-theme"

export type IGTab = "inicio" | "contenido" | "audiencia" | "mensajes" | "publicar"

const TABS: { id: IGTab; icon: React.ElementType; label: string }[] = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "contenido", icon: Grid3X3, label: "Contenido" },
  { id: "audiencia", icon: TrendingUp, label: "Audiencia" },
  { id: "mensajes", icon: MessageCircle, label: "Mensajes" },
  { id: "publicar", icon: PlusSquare, label: "Publicar" },
]

interface Props {
  active: IGTab
  onChange: (tab: IGTab) => void
}

export function IGTabNav({ active, onChange }: Props) {
  return (
    <div className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-4xl mx-auto flex">
        {TABS.map(({ id, icon: Icon, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="relative flex-1 flex flex-col items-center gap-1.5 py-3 text-xs font-medium transition-colors"
              style={{ color: isActive ? "var(--foreground)" : "var(--muted-foreground)" }}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span className="hidden sm:block">{label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full" style={{ background: IG_GRADIENT }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
