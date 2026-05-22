import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export default async function OnboardingPage() {
  // Must be logged in
  await requireAuth()

  const supabase = await createClient()
  const { data: settings } = await supabase
    .from("client_settings")
    .select("business_name, brand_color, currency, onboarding_completed")
    .single()

  // Already onboarded — kick to dashboard
  if (settings?.onboarding_completed) {
    redirect("/")
  }

  return (
    <OnboardingWizard
      initialBusinessName={settings?.business_name ?? ""}
      initialBrandColor={settings?.brand_color ?? "#236461"}
      initialCurrency={settings?.currency ?? "USD"}
    />
  )
}
