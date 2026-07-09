"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth/use-session"
import { fetchWithAuth } from "@/lib/api-client"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

const REQUIRED_LAYERS = ["framework", "vocabulario", "casos"]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  const router = useRouter()
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    // Un platform admin sin client_id no pertenece a ningún tenant — su
    // portal es /admin, no el dashboard de un cliente.
    if (session && !session.clientId) router.replace("/admin")
  }, [session, router])

  useEffect(() => {
    if (!session?.clientId) return
    if (session.role !== "owner" && session.role !== "admin") {
      setOnboardingChecked(true)
      return
    }
    fetchWithAuth("/api/omni/mentor")
      .then((r) => r.json())
      .then((data) => {
        const layersCovered = new Set((data.knowledge ?? []).map((k: { layer: string }) => k.layer))
        const complete =
          !!data.businessName?.trim() && !!data.mentorName?.trim() && REQUIRED_LAYERS.every((l) => layersCovered.has(l))
        setNeedsOnboarding(!complete)
        setOnboardingChecked(true)
      })
  }, [session])

  if (loading || !session || !session.clientId || !onboardingChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Cargando…</div>
    )
  }

  if (needsOnboarding) {
    return <OnboardingWizard onComplete={() => setNeedsOnboarding(false)} />
  }

  return <DashboardShell session={session}>{children}</DashboardShell>
}
