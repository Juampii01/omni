"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

const NOTIFICATIONS: { message: string; type: "success" | "error" | "info" }[] = [
  { message: "María calificó un nuevo lead: Roberto Sánchez", type: "info" },
  { message: "Diego cerró con Federico Acosta 🎉 +$5,400", type: "success" },
  { message: "Nueva tarea asignada por Lucas: 'Revisar pitch deck'", type: "info" },
  { message: "Camila Ruiz solicitó reembolso — revisar urgente", type: "error" },
  { message: "Sofía publicó nuevo reel en Instagram ✨", type: "success" },
  { message: "Roberto Sánchez avanzó a 'Llamada agendada'", type: "info" },
  { message: "Nuevo lead desde Instagram: Valentina Castro", type: "info" },
  { message: "Recordatorio: call de equipo en 30 minutos", type: "info" },
  { message: "Diego mejoró su close rate a 35% este mes 🚀", type: "success" },
  { message: "Ana Torres firmó el contrato de mentoría ✅", type: "success" },
  { message: "Mateo Domínguez sin contacto hace 14 días — seguimiento pendiente", type: "error" },
  { message: "Sofía programó 3 reels para esta semana", type: "info" },
]

export function LiveNotifications() {
  const idxRef = useRef(0)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    function fire() {
      const n = NOTIFICATIONS[idxRef.current % NOTIFICATIONS.length]
      idxRef.current++

      if (n.type === "success") toast.success(n.message)
      else if (n.type === "error") toast.error(n.message)
      else toast.info(n.message)

      // Next fires between 45 and 90 seconds
      const delay = 45_000 + Math.random() * 45_000
      timeout = setTimeout(fire, delay)
    }

    // First notification fires after 20 seconds so it feels natural
    timeout = setTimeout(fire, 20_000)
    return () => clearTimeout(timeout)
  }, [])

  return null
}
