"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const ITEMS: { q: string; a: string }[] = [
  {
    q: "¿Omni es mío de verdad?",
    a: "Sí: tu propia instancia, tu dominio, tu marca y tus datos aislados. No compartís base con otros usuarios.",
  },
  { q: "¿Puedo usar mi propio dominio?", a: "Sí. Configuramos Omni en tu dominio para que sea 100% tu sistema." },
  {
    q: "¿Cuánto tarda el setup?",
    a: "Lo definimos en la demo según el alcance. El proceso es acompañado: configuramos tu instancia con vos.",
  },
  {
    q: "¿Necesito saber de tecnología?",
    a: "No. Nosotros lo configuramos y te acompañamos. Vos te enfocás en operar tu negocio.",
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="mx-auto max-w-2xl divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      {ITEMS.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={i}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-medium text-foreground">{item.q}</span>
              <ChevronDown
                size={16}
                className={`flex-shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>}
          </div>
        )
      })}
    </div>
  )
}
