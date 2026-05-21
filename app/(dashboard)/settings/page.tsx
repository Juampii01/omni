import { requireAuth } from "@/lib/auth/get-user"
import { PageHeader } from "@/components/page-header"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { Palette, Plug, CreditCard, User } from "lucide-react"

export const metadata = { title: "Configuración — Omni" }
import { cn } from "@/lib/utils"

const SETTING_GROUPS = [
  {
    label: "Cuenta",
    items: [
      { title: "Mi perfil", description: "Nombre, foto y datos personales", href: "/settings/profile", icon: User },
    ],
  },
  {
    label: "Empresa",
    items: [
      { title: "Branding", description: "Logo, colores y nombre del negocio", href: "/settings/branding", icon: Palette },
      { title: "Integraciones", description: "Conectá Instagram, Meta Ads, y más", href: "/settings/integrations", icon: Plug },
    ],
  },
  {
    label: "Plan",
    items: [
      { title: "Facturación", description: "Plan actual, créditos IA y pagos", href: "/settings/billing", icon: CreditCard },
    ],
  },
]

export default async function SettingsPage() {
  await requireAuth()

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        title="Configuración"
        description="Gestioná tu cuenta y las preferencias de la empresa"
      />

      {SETTING_GROUPS.map(({ label, items }) => (
        <div key={label}>
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
            {label}
          </h2>
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {items.map(({ title, description, href, icon: Icon }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <span className="text-muted-foreground text-sm">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
