"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, BarChart2, Users, GitBranch,
  CheckSquare, UserCog, FileText, Binoculars,
  Sparkles, ClipboardList, MessageSquare, Settings,
  Radio, TrendingUp, Plug, Smartphone,
  CalendarDays,
} from "lucide-react"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  "bar-chart-2":      BarChart2,
  "users":            Users,
  "git-branch":       GitBranch,
  "check-square":     CheckSquare,
  "user-cog":         UserCog,
  "file-text":        FileText,
  "binoculars":       Binoculars,
  "sparkles":         Sparkles,
  "clipboard-list":   ClipboardList,
  "message-square":   MessageSquare,
  "settings":         Settings,
  "radio":            Radio,
  "trending-up":      TrendingUp,
  "plug":             Plug,
  "smartphone":       Smartphone,
  "calendar-days":    CalendarDays,
}

const NAV = [
  {
    section: "Principal",
    items: [
      { label: "Overview",   href: "/",          icon: "layout-dashboard" },
      { label: "KPIs",       href: "/kpis",       icon: "bar-chart-2" },
    ],
  },
  {
    section: "Ventas",
    items: [
      { label: "Leads",       href: "/crm",          icon: "users" },
      { label: "Pipeline",    href: "/crm/pipeline", icon: "git-branch" },
      { label: "Calendario",  href: "/calendar",     icon: "calendar-days" },
    ],
  },
  {
    section: "Operaciones",
    items: [
      { label: "Tareas",  href: "/tasks", icon: "check-square" },
      { label: "Equipo",  href: "/team",  icon: "user-cog" },
    ],
  },
  {
    section: "Contenido",
    items: [
      { label: "Contenido",    href: "/content",     icon: "file-text" },
      { label: "Competidores", href: "/competitors", icon: "binoculars" },
    ],
  },
  {
    section: "Inteligencia",
    items: [
      { label: "IA Asistente", href: "/ai",        icon: "sparkles" },
      { label: "Discovery",   href: "/discovery", icon: "clipboard-list" },
    ],
  },
  {
    section: "Comunicación",
    items: [
      { label: "Comunicaciones", href: "/comms", icon: "message-square" },
    ],
  },
  {
    section: "Canales",
    items: [
      { label: "Redes Sociales",  href: "/socials",      icon: "radio" },
      { label: "Publicidad",      href: "/ads",           icon: "trending-up" },
      { label: "Integraciones",   href: "/integrations",  icon: "plug" },
      { label: "App Móvil",       href: "/mobile",        icon: "smartphone" },
    ],
  },
]

interface NavItemProps {
  label: string
  href: string
  icon: string
  onClick?: () => void
}

function NavItem({ label, href, icon, onClick }: NavItemProps) {
  const pathname = usePathname()
  const Icon = ICON_MAP[icon] ?? LayoutDashboard
  const isActive =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")

  return (
    <Link href={href} onClick={onClick}>
      <div
        className={cn(
          "group relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150",
          isActive
            ? "bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-border/60 dark:hover:bg-white/5"
        )}
      >
        {/* Active indicator */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand rounded-r-full" />
        )}
        <Icon
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-colors",
            isActive
              ? "text-brand"
              : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
          )}
        />
        <span className="flex-1 truncate">{label}</span>
      </div>
    </Link>
  )
}

interface SidebarProps {
  onClose?: () => void
  businessName?: string
}

export function Sidebar({ onClose, businessName }: SidebarProps) {
  const name = businessName ?? "KAVAR"
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border flex-shrink-0">
        {/* Brand mark */}
        <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-[11px] font-black text-brand-foreground tracking-tight">
            {initial}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-sidebar-foreground tracking-tight leading-none truncate">
            {name}
          </p>
          <p className="text-[10px] text-sidebar-foreground/40 mt-0.5 leading-none">
            Omni OS
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/30 px-3 mb-1.5">
              {section}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavItem key={item.href} {...item} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings footer */}
      <div className="border-t border-sidebar-border px-2 py-3">
        <NavItem label="Configuración" href="/settings" icon="settings" onClick={onClose} />
      </div>
    </div>
  )
}
