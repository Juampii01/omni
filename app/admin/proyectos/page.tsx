import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"

type Project = { name: string; url: string }

const GROUPS: { name: string; projects: Project[] }[] = [
  {
    name: "Nova Softwares / Omni",
    projects: [
      { name: "Omni", url: "https://novasoftwares.space" },
      { name: "Nova Asistant", url: "https://nova-asistant.vercel.app" },
    ],
  },
  {
    name: "GovBidder",
    projects: [
      { name: "GovBidder Connect", url: "https://www.govbidderconnect.com" },
      { name: "GovBidder Challenge", url: "https://dboard.govbidder.net" },
      { name: "GovBidder Club", url: "https://dboard.govbidderclub.com" },
      { name: "GovBidder Dashboard", url: "https://govbidder-dashboard.vercel.app" },
      { name: "Verificación de certificados", url: "https://verify.gobvidder.net" },
      { name: "Contratos / Firmas", url: "https://sign.govbidder.net" },
      { name: "Retiro de inversionista", url: "https://rt.govbidder.net" },
      { name: "Certificación de pagos", url: "https://certificacion-de-pagos-iota.vercel.app" },
    ],
  },
  {
    name: "Smart Scale / Coaching",
    projects: [
      { name: "Smart Scale", url: "https://smartscale.space" },
      { name: "Strategy Coach", url: "https://www.strategycoach.us" },
    ],
  },
  {
    name: "Inmobiliaria Acosta",
    projects: [
      { name: "Web Inmobiliaria", url: "https://www.acostainmobiliaria.com" },
      { name: "CRM Inmobiliaria", url: "https://crm.acostainmobiliaria.com" },
    ],
  },
  {
    name: "Otros",
    projects: [
      { name: "Influenup", url: "https://www.influenup.app" },
      { name: "El Vestuario", url: "https://www.elvestuario.net" },
      { name: "Vendly", url: "https://vendly-mod.space" },
      { name: "Content Dashboard", url: "https://content-dashboard-coral.vercel.app" },
      { name: "Dashboard Demo", url: "https://dashboard-demo-sepia-five.vercel.app" },
      { name: "Claude Curso", url: "https://claude-curso-self.vercel.app" },
    ],
  },
]

function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}

export default function ProyectosPage() {
  const total = GROUPS.reduce((n, g) => n + g.projects.length, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl">Proyectos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos tus desarrollos, en un solo lugar · {total} proyectos.
        </p>
      </div>

      {GROUPS.map((group) => (
        <div key={group.name} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.name}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.projects.map((p) => (
              <Card key={p.url}>
                <CardHeader>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="truncate text-xs text-muted-foreground">{host(p.url)}</p>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
                  >
                    <ExternalLink /> Abrir
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
