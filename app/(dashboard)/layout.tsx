import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { LastSeenUpdater } from "@/components/last-seen-updater"
import { buildThemeCssVars, themeToCss } from "@/lib/theme/load-theme"
import { BRAND_COLOR_HEX } from "@/lib/constants"

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()

  // Load client settings for dynamic theming (server-side = no FOUC)
  const supabase = await createClient()
  const { data } = await supabase
    .from("client_settings")
    .select("brand_color, business_name")
    .single()
  const settings = data as { brand_color: string; business_name: string } | null

  const brandColor = settings?.brand_color ?? BRAND_COLOR_HEX
  const themeVars = buildThemeCssVars(brandColor)
  const inlineCss = themeToCss(themeVars)

  return (
    <>
      {/* Inject dynamic theme vars — prevents FOUC */}
      <style dangerouslySetInnerHTML={{ __html: `:root { ${inlineCss} }` }} />
      <LastSeenUpdater userId={user.id} />
      <DashboardLayout>{children}</DashboardLayout>
    </>
  )
}
