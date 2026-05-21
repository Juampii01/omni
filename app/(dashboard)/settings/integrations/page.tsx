import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Instagram, BarChart2, Youtube } from "lucide-react"

import Link from "next/link"

export const metadata = { title: "Integraciones" }

const INTEGRATIONS = [
  {
    id: "instagram",
    label: "Instagram",
    description: "Métricas de reach, seguidores y contenido",
    icon: Instagram,
    available: false,
  },
  {
    id: "meta-ads",
    label: "Meta Ads",
    description: "Gasto, CPL, CTR y creativos activos",
    icon: BarChart2,
    available: false,
  },
  {
    id: "youtube",
    label: "YouTube",
    description: "Suscriptores, views y watch time",
    icon: Youtube,
    available: false,
  },
]

export default function IntegrationsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader title="Integraciones" description="Conectá tus plataformas para sincronizar datos automáticamente" />
      </div>

      <div className="space-y-3">
        {INTEGRATIONS.map(({ id, label, description, icon: Icon, available }) => (
          <Card key={id} className="border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              {available ? (
                <Button size="sm" variant="outline">Conectar</Button>
              ) : (
                <Badge variant="secondary" className="text-xs">Próximamente</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
