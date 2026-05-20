import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart2, Users, CheckSquare, Sparkles, TrendingUp } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const QUICK_LINKS = [
  {
    label: "KPIs del mes",
    description: "Métricas y objetivos del período actual",
    href: "/kpis",
    icon: BarChart2,
    color: "text-brand",
    bg: "bg-brand-soft",
  },
  {
    label: "Pipeline de ventas",
    description: "Leads activos y etapas del proceso",
    href: "/crm",
    icon: Users,
    color: "text-info",
    bg: "bg-blue-50",
  },
  {
    label: "Tareas",
    description: "Pendientes y en progreso del equipo",
    href: "/tasks",
    icon: CheckSquare,
    color: "text-warning",
    bg: "bg-amber-50",
  },
  {
    label: "IA Asistente",
    description: "Consultá dudas, analizá datos, generá ideas",
    href: "/ai",
    icon: Sparkles,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
]

export default async function OverviewPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const [{ data: rawSettings }, { count: leadsCount }, { count: tasksCount }] = await Promise.all([
    supabase.from("client_settings").select("business_name, onboarding_completed").single(),
    supabase.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null).in("stage", ["new", "qualified", "meeting_scheduled"]),
    supabase.from("tasks").select("id", { count: "exact", head: true }).is("deleted_at", null).in("status", ["todo", "in_progress"]),
  ])
  const settings = rawSettings as { business_name: string; onboarding_completed: boolean } | null

  const businessName = settings?.business_name ?? "tu empresa"
  const firstName = user.full_name?.split(" ")[0] ?? "ahí"

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Buen día, ${firstName} 👋`}
        description={`Resumen operativo de ${businessName}`}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Leads activos
            </p>
            <p className="text-3xl font-semibold tabular-nums">{leadsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-brand" />
              En progreso
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Tareas pendientes
            </p>
            <p className="text-3xl font-semibold tabular-nums">{tasksCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-brand" />
              Sin completar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Accesos rápidos</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_LINKS.map(({ label, description, href, icon: Icon, color, bg }) => (
            <Link key={href} href={href}>
              <Card className="border-border shadow-sm hover:shadow-md transition-all hover:border-brand/20 cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-2", bg)}>
                    <Icon className={cn("h-5 w-5", color)} />
                  </div>
                  <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                  <CardDescription className="text-xs">{description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Onboarding banner if not completed */}
      {settings && !settings.onboarding_completed && (
        <Card className="border-brand/20 bg-brand-soft shadow-sm">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Completá la configuración inicial</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agregá el branding de tu empresa y configurá las integraciones para empezar.
              </p>
            </div>
            <Link
              href="/settings/branding"
              className="text-xs font-medium text-brand hover:text-brand-hover whitespace-nowrap transition-colors"
            >
              Ir a configuración →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
