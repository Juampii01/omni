import { requireAuth } from "@/lib/auth/get-user"
import { IGProPage } from "@/components/instagram/pro/IGProPage"

export const metadata = { title: "Instagram" }
export const dynamic = "force-dynamic"

// UI "Pro" (handoff). El componente cliente IGProPage trae sus propios datos
// vía los endpoints /api/instagram/*. La versión previa (instagram-client.tsx)
// queda en el repo sin uso por si hay que volver atrás.
export default async function InstagramPage() {
  await requireAuth()
  return <IGProPage />
}
