import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function BillingPage() {
  await requireAuth()
  const supabase = await createClient()
  const { data: rawSettings } = await supabase
    .from("client_settings")
    .select("ai_credits_used, ai_credits_limit")
    .single()
  const settings = rawSettings as { ai_credits_used: number; ai_credits_limit: number } | null

  const used = settings?.ai_credits_used ?? 0
  const limit = settings?.ai_credits_limit ?? 100000
  const pct = Math.round((used / limit) * 100)

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader title="Facturación" description="Plan activo, créditos IA y pagos" />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Plan actual</CardTitle>
            <Badge className="bg-brand text-brand-foreground">Activo</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Créditos IA usados</span>
              <span className="tabular-nums font-medium">{used.toLocaleString()} / {limit.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{pct}% utilizado este período</p>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Para gestionar tu suscripción o agregar créditos, contactá a tu representante de Nova Softwares.
      </p>
    </div>
  )
}
