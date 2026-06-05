import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  TrendingUp, TrendingDown, Users, CheckSquare,
  Sparkles, BarChart2, GitBranch, AlertTriangle,
  Pin, ArrowRight, DollarSign, Clock, Send, Flame,
} from "lucide-react"

export const metadata = { title: "Overview" }

function fmt(value: number, unit: string = "USD"): string {
  const u = unit.toLowerCase()
  if (u === "usd" || u === "$") {
    if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
    return `$${value.toLocaleString("en-US")}`
  }
  if (u === "percent" || u === "%") return `${value}%`
  return value.toLocaleString("es-AR")
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  })
}

const STAGE_LABEL: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  call_scheduled: "Llamada agendada",
  call_done: "Llamada hecha",
  proposal_sent: "Propuesta enviada",
  won: "Ganado",
  lost: "Perdido",
}

const ACTIVE_STAGES = ["new", "contacted", "qualified", "call_scheduled", "call_done", "proposal_sent"]

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-red-500 dark:text-red-400",
  high:   "text-orange-500 dark:text-orange-400",
  medium: "text-blue-500 dark:text-blue-400",
  low:    "text-muted-foreground",
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high:   "bg-orange-400",
  medium: "bg-blue-400",
  low:    "bg-muted-foreground",
}

export default async function OverviewPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  const sb = supabase as any

  const todayISO = new Date().toISOString().slice(0, 10)

  const [
    { data: rawSettings },
    { data: kpiMrr },
    { count: clientsCount },
    { data: pipelineLeads },
    { count: tasksCount },
    { data: announcements },
    { data: urgentTasks },
    { data: newLeads },
    { data: overdueTasks },
    { count: proposalCount },
  ] = await Promise.all([
    sb.from("client_settings").select("business_name, ai_credits_used, ai_credits_limit").single(),
    sb.from("kpis").select("metric_value, period_month").eq("metric_name", "MRR").order("period_month", { ascending: false }).limit(2),
    sb.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("stage", "won"),
    sb.from("leads").select("id, full_name, stage, amount, created_at").is("deleted_at", null).in("stage", ACTIVE_STAGES).order("amount", { ascending: false }).limit(6),
    sb.from("tasks").select("id", { count: "exact", head: true }).is("deleted_at", null).in("status", ["todo", "in_progress"]),
    sb.from("announcements").select("id, title, body, is_pinned, created_at").eq("is_pinned", true).order("created_at", { ascending: false }).limit(3),
    sb.from("tasks").select("id, title, priority, status, due_date").is("deleted_at", null).in("status", ["todo", "in_progress"]).in("priority", ["urgent", "high"]).order("priority", { ascending: true }).limit(5),
    sb.from("leads").select("id, full_name, created_at").is("deleted_at", null).eq("stage", "new").order("created_at", { ascending: true }).limit(6),
    sb.from("tasks").select("id, title, due_date").is("deleted_at", null).in("status", ["todo", "in_progress"]).lt("due_date", todayISO).order("due_date", { ascending: true }).limit(6),
    sb.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("stage", "proposal_sent"),
  ])

  const settings = rawSettings as { business_name: string; ai_credits_used: number; ai_credits_limit: number } | null
  const businessName = settings?.business_name ?? "tu empresa"

  // MRR metrics
  const mrr = (kpiMrr?.[0]?.metric_value ?? 0) as number
  const prevMrr = (kpiMrr?.[1]?.metric_value ?? 0) as number
  const mrrGrowth = prevMrr > 0 ? Math.round(((mrr - prevMrr) / prevMrr) * 100) : null

  // Pipeline
  const pipelineValue = (pipelineLeads ?? []).reduce((acc: number, l: any) => acc + (Number(l.amount) || 0), 0)
  const pipelineCount = pipelineLeads?.length ?? 0

  // Greeting
  const rawName = user.full_name?.includes("@") ? null : user.full_name
  const firstName = rawName?.split(" ")[0] ?? null
  const hour = new Date().getHours()
  const saludo = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"

  // Day label
  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1)

  // ── Omni Intelligence: "Qué hacer hoy" ────────────────────────────────────
  // Señales reales del negocio → acciones priorizadas (determinístico, sin costo IA).
  const overdue = (overdueTasks ?? []) as { id: string; title: string; due_date: string }[]
  const freshLeads = (newLeads ?? []) as { id: string; full_name: string; created_at: string }[]
  const urgentNow = (urgentTasks ?? []) as { id: string; priority: string }[]
  const proposalsOpen = proposalCount ?? 0

  const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)

  type BriefAction = {
    sev: "urgent" | "high" | "medium"
    icon: React.ComponentType<{ className?: string }>
    title: string
    detail?: string
    href: string
  }
  const actions: BriefAction[] = []

  if (overdue.length > 0) {
    actions.push({
      sev: "urgent",
      icon: Clock,
      title: `${overdue.length} ${overdue.length === 1 ? "tarea vencida" : "tareas vencidas"}`,
      detail: `La más atrasada: «${overdue[0].title}»`,
      href: "/tasks",
    })
  }
  if (freshLeads.length > 0) {
    const oldest = freshLeads[0]
    const d = daysAgo(oldest.created_at)
    actions.push({
      sev: "high",
      icon: Send,
      title: `${freshLeads.length} ${freshLeads.length === 1 ? "lead nuevo sin contactar" : "leads nuevos sin contactar"}`,
      detail: `El más antiguo: ${oldest.full_name}${d > 0 ? ` · hace ${d}d` : " · hoy"}`,
      href: "/crm",
    })
  }
  const urgentPending = urgentNow.length
  if (urgentPending > 0) {
    actions.push({
      sev: "high",
      icon: Flame,
      title: `${urgentPending} ${urgentPending === 1 ? "tarea de prioridad alta" : "tareas de prioridad alta"} para hoy`,
      href: "/tasks",
    })
  }
  if (proposalsOpen > 0) {
    actions.push({
      sev: "medium",
      icon: GitBranch,
      title: `${proposalsOpen} ${proposalsOpen === 1 ? "propuesta esperando" : "propuestas esperando"} respuesta`,
      detail: "Hacé seguimiento antes de que se enfríen",
      href: "/crm",
    })
  }
  if (mrrGrowth !== null && mrrGrowth < 0) {
    actions.push({
      sev: "medium",
      icon: TrendingDown,
      title: `El MRR cayó ${Math.abs(mrrGrowth)}% vs el mes anterior`,
      detail: "Revisá churn y pipeline de cierre",
      href: "/kpis",
    })
  }

  const topActions = actions.slice(0, 4)
  const allClear = topActions.length === 0
  const briefHeadline = allClear
    ? "Todo al día. No hay pendientes críticos."
    : topActions[0].sev === "urgent"
      ? "Arrancá por lo urgente."
      : "Tu día, en foco."

  // Narrativa breve a partir de las señales.
  const bits: string[] = []
  if (overdue.length) bits.push(`${overdue.length} ${overdue.length === 1 ? "tarea vencida" : "tareas vencidas"}`)
  if (freshLeads.length) bits.push(`${freshLeads.length} ${freshLeads.length === 1 ? "lead sin contactar" : "leads sin contactar"}`)
  if (proposalsOpen) bits.push(`${proposalsOpen} ${proposalsOpen === 1 ? "propuesta abierta" : "propuestas abiertas"}`)
  const briefNarrative = allClear
    ? "Revisé tus tareas, leads y KPIs: no encontré nada que requiera tu atención inmediata. Buen momento para trabajar en estrategia o contenido."
    : `Hoy tenés ${bits.length > 1 ? bits.slice(0, -1).join(", ") + " y " + bits.slice(-1) : bits[0]}. ${topActions[0].sev === "urgent" ? "Empezá por las tareas vencidas." : "Priorizá lo de arriba y delegá el resto."}`

  const aiPrompt = encodeURIComponent(
    "Analizá mi negocio hoy (pipeline, tareas y KPIs) y dame un plan de acción concreto y priorizado para las próximas horas.",
  )

  const SEV_DOT: Record<BriefAction["sev"], string> = {
    urgent: "bg-red-500",
    high: "bg-orange-400",
    medium: "bg-brand",
  }

  return (
    <div className="space-y-8">

      {/* ── Hero greeting ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {saludo}{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="text-sm text-muted-foreground">
          {todayCapitalized} &middot; {businessName}
        </p>
      </div>

      {/* ── Omni Intelligence: Qué hacer hoy ──────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/[0.08] via-card to-card p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-[0_0_20px_hsl(var(--brand)/0.45)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand font-sans">
                Omni Intelligence
              </span>
              <span className="text-[10px] text-muted-foreground/50">·</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60 font-sans">
                Qué hacer hoy
              </span>
            </div>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">{briefHeadline}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{briefNarrative}</p>

            {topActions.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {topActions.map((a, i) => {
                  const Icon = a.icon
                  return (
                    <li key={i}>
                      <Link
                        href={a.href}
                        className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 -mx-1 transition-colors hover:border-border hover:bg-muted/40"
                      >
                        <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", SEV_DOT[a.sev])} />
                        <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground leading-snug">{a.title}</span>
                          {a.detail && (
                            <span className="block text-xs text-muted-foreground leading-snug truncate">{a.detail}</span>
                          )}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}

            <Link
              href={`/ai?q=${aiPrompt}`}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-hover transition-colors font-sans"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Profundizá con la IA
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI metric cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="relative rounded-xl border border-border bg-card p-5 overflow-hidden group hover:border-brand/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">MRR</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {fmt(mrr, "USD")}
          </p>
          {mrrGrowth !== null && (
            <p className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              mrrGrowth > 0 ? "text-emerald-500" : mrrGrowth < 0 ? "text-red-500" : "text-muted-foreground"
            )}>
              {mrrGrowth > 0
                ? <TrendingUp className="h-3 w-3" />
                : mrrGrowth < 0
                ? <TrendingDown className="h-3 w-3" />
                : null}
              {mrrGrowth > 0 ? "+" : ""}{mrrGrowth}% vs mes ant.
            </p>
          )}
          {mrrGrowth === null && (
            <p className="text-xs text-muted-foreground mt-2">Mes en curso</p>
          )}
        </div>

        {/* Clientes activos */}
        <div className="relative rounded-xl border border-border bg-card p-5 overflow-hidden hover:border-brand/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clientes</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {clientsCount ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {(clientsCount ?? 0) === 1 ? "cliente activo" : "clientes activos"}
          </p>
        </div>

        {/* Pipeline */}
        <div className="relative rounded-xl border border-border bg-card p-5 overflow-hidden hover:border-brand/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pipeline</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <GitBranch className="h-4 w-4 text-purple-500" />
            </div>
          </div>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {pipelineCount}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {pipelineCount === 1 ? "lead en progreso" : "leads en progreso"}
            {pipelineValue > 0 && ` · ${fmt(pipelineValue, "USD")}`}
          </p>
        </div>

        {/* Tareas */}
        <div className="relative rounded-xl border border-border bg-card p-5 overflow-hidden hover:border-brand/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tareas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CheckSquare className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {tasksCount ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-2">pendientes de hacer</p>
        </div>
      </div>

      {/* ── Announcements strip ───────────────────────────────────── */}
      {(announcements ?? []).length > 0 && (
        <div className="space-y-2">
          {(announcements ?? []).map((ann: any) => (
            <div
              key={ann.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3.5",
                "bg-brand-soft/60 border-brand/20 dark:bg-brand-soft dark:border-brand/30"
              )}
            >
              <Pin className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug">{ann.title}</p>
                {ann.body && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {ann.body}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                {formatDate(ann.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Two-column: Urgent tasks + Pipeline ───────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Urgent tasks */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <h2 className="text-sm font-semibold text-foreground">Tareas urgentes</h2>
            </div>
            <Link
              href="/tasks"
              className="text-xs text-brand hover:text-brand-hover flex items-center gap-0.5 transition-colors"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(urgentTasks ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">Sin tareas urgentes</p>
              </div>
            ) : (
              (urgentTasks ?? []).map((task: any) => (
                <Link key={task.id} href="/tasks" className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                  <span className={cn("mt-1.5 w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[task.priority] ?? "bg-muted-foreground")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground leading-snug truncate group-hover:text-brand transition-colors">
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Vence {formatDate(task.due_date)}
                      </p>
                    )}
                  </div>
                  <span className={cn("text-[10px] font-semibold uppercase mt-0.5 flex-shrink-0", PRIORITY_COLOR[task.priority])}>
                    {task.priority === "urgent" ? "Urgente" : "Alta"}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Pipeline leads */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-foreground">Pipeline activo</h2>
            </div>
            <Link
              href="/crm/pipeline"
              className="text-xs text-brand hover:text-brand-hover flex items-center gap-0.5 transition-colors"
            >
              Ver pipeline <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(pipelineLeads ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">Sin leads activos</p>
                <Link
                  href="/crm"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-brand hover:text-brand-hover"
                >
                  Agregar lead <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              (pipelineLeads ?? []).map((lead: any) => (
                <Link
                  key={lead.id}
                  href={`/crm/${lead.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-muted-foreground">
                    {lead.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground leading-snug truncate group-hover:text-brand transition-colors">
                      {lead.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {STAGE_LABEL[lead.stage] ?? lead.stage}
                    </p>
                  </div>
                  {Number(lead.amount) > 0 && (
                    <span className="text-xs font-semibold text-foreground flex-shrink-0">
                      {fmt(Number(lead.amount), "USD")}<span className="text-muted-foreground font-normal">/mes</span>
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
          Accesos rápidos
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "KPIs", href: "/kpis", icon: BarChart2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Leads", href: "/crm", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Tareas", href: "/tasks", icon: CheckSquare, color: "text-amber-500", bg: "bg-amber-500/10" },
            { label: "IA Asistente", href: "/ai", icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/10" },
          ].map(({ label, href, icon: Icon, color, bg }) => (
            <Link key={href} href={href}>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-brand/30 hover:bg-muted/30 transition-all group cursor-pointer">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-brand transition-colors">
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
