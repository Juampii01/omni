"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, BarChart2, Users, GitBranch,
  CheckSquare, UserCog, FileText, Binoculars,
  Sparkles, ClipboardList, MessageSquare, Settings,
  ChevronRight,
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
      { label: "Leads",     href: "/crm",          icon: "users" },
      { label: "Pipeline",  href: "/crm/pipeline", icon: "git-branch" },
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
      { label: "Canales", href: "/comms", icon: "message-square" },
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
          "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors duration-150 group",
          isActive
            ? "bg-brand/8 text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-colors",
            isActive ? "text-brand" : "text-muted-foreground group-hover:text-foreground"
          )}
        />
        <span className="flex-1 truncate">{label}</span>
        {isActive && <ChevronRight className="h-3 w-3 text-brand/50 ml-auto" />}
      </div>
    </Link>
  )
}

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-brand-foreground">O</span>
        </div>
        <span className="font-semibold text-sm text-foreground">Omni</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 px-3 mb-1">
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
      <div className="border-t border-border px-2 py-3">
        <NavItem label="Configuración" href="/settings" icon="settings" onClick={onClose} />
      </div>
    </div>
  )
}
