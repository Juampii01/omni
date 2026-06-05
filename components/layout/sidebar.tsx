"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BrainCircuit,
  Users,
  BarChart2,
  CheckSquare,
  UserCog,
  FileEdit,
  Target,
  Zap,
  Settings,
  Instagram,
  Contact,
  Gauge,
  Sparkles,
  MessageCircle,
  MessagesSquare,
} from "lucide-react"
import { UserMenu } from "./user-menu"

const NAV_SECTIONS = [
  {
    section: null,
    items: [
      { label: "Hoy",              href: "/",        icon: LayoutDashboard },
      { label: "Omni Intelligence", href: "/ai",     icon: Sparkles },
    ],
  },
  {
    section: "Operación",
    items: [
      { label: "Clientes",       href: "/clients",       icon: Users },
      { label: "Conversaciones", href: "/conversations", icon: MessageCircle },
      { label: "Leads",          href: "/crm",           icon: Contact },
    ],
  },
  {
    section: "Equipo",
    items: [
      { label: "Chat interno",   href: "/chat",         icon: MessagesSquare },
      { label: "Tareas",         href: "/tasks",        icon: CheckSquare },
      { label: "Equipo",         href: "/team",         icon: UserCog },
    ],
  },
  {
    section: "Crecimiento",
    items: [
      { label: "Métricas",       href: "/metrics",      icon: BarChart2 },
      { label: "KPIs",           href: "/kpis",         icon: Gauge },
      { label: "Contenido",      href: "/content",      icon: FileEdit },
      { label: "Instagram",      href: "/socials/instagram", icon: Instagram },
      { label: "Automatizaciones", href: "/automations", icon: Zap },
      { label: "Estrategia",     href: "/strategy",     icon: Target },
      { label: "Investigación",  href: "/research",     icon: BrainCircuit },
    ],
  },
]

interface NavItemProps {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
}

function NavItem({ label, href, icon: Icon, onClick }: NavItemProps) {
  const pathname = usePathname()
  const isActive =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")

  return (
    <Link href={href} onClick={onClick}>
      <div
        className={cn(
          "relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 group",
          "font-sans",
          isActive
            ? "bg-brand/10 text-brand"
            : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
        )}
      >
        {/* Active left border */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand rounded-r-full" />
        )}
        <Icon
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-colors",
            isActive ? "text-brand" : "text-muted-foreground/60 group-hover:text-foreground/80"
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
  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* ── Logo ────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-sidebar-border flex-shrink-0">
        <div className="w-6 h-6 rounded bg-brand flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-black text-brand-foreground leading-none">O</span>
        </div>
        <div>
          <span className="text-[15px] font-semibold text-foreground tracking-tight font-sans">
            Omni
          </span>
          {businessName && (
            <span className="ml-1.5 text-[10px] text-muted-foreground font-sans">
              · {businessName}
            </span>
          )}
        </div>
      </div>

      {/* ── Nav ─────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_SECTIONS.map(({ section, items }, idx) => (
          <div key={idx}>
            {section && (
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/40 px-3 mb-2 font-sans">
                {section}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavItem key={item.href} {...item} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ──────────────────────────── */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
        <NavItem
          label="Configuración"
          href="/settings"
          icon={Settings}
          onClick={onClose}
        />
        {/* User avatar at very bottom */}
        <div className="px-3 py-2">
          <UserMenu compact />
        </div>
      </div>
    </div>
  )
}
