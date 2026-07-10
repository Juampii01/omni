"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "motion/react"
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  Hash,
  AtSign,
  BookOpen,
  Settings,
  LogOut,
  Search,
  ChevronsUpDown,
  Building2,
  FileText,
  ClipboardList,
  KanbanSquare,
  Lightbulb,
  Radio,
  CalendarDays,
  Zap,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { CommandMenu } from "@/components/layout/command-menu"
import { NotificationBell } from "@/components/layout/notification-bell"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase"
import type { SessionInfo } from "@/lib/auth/use-session"

const NAV_GROUPS = [
  {
    label: "Negocio",
    items: [
      { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
      { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
      { href: "/dashboard/leads", label: "Leads", icon: Users },
      { href: "/dashboard/briefings", label: "Briefings", icon: Radio },
      { href: "/dashboard/mentor", label: "Mentor", icon: BookOpen },
      { href: "/dashboard/context", label: "Context Room", icon: Building2 },
      { href: "/dashboard/calendar", label: "Calendario", icon: CalendarDays },
    ],
  },
  {
    label: "Contenido",
    items: [
      { href: "/dashboard/community", label: "Comunidad", icon: Hash },
      { href: "/dashboard/conversations", label: "Conversaciones", icon: AtSign },
      { href: "/dashboard/content", label: "Contenido", icon: Lightbulb },
      { href: "/dashboard/docs", label: "Documentos", icon: FileText },
      { href: "/dashboard/sops", label: "SOPs", icon: ClipboardList },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { href: "/dashboard/tasks", label: "Tareas", icon: KanbanSquare },
      { href: "/dashboard/automations", label: "Automatizaciones", icon: Zap },
      { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
    ],
  },
] as const

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("")
}

export function DashboardShell({ session, children }: { session: SessionInfo; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [commandOpen, setCommandOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <CommandMenu />

      <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-6 py-7">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            O
          </div>
          <p className="font-heading text-xl italic tracking-tight text-sidebar-foreground">Omni</p>
        </div>

        <div className="px-3 pb-3">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/30 px-3 py-1.5 text-xs text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/60"
          >
            <Search className="h-3.5 w-3.5" />
            Buscar…
            <kbd className="ml-auto rounded border border-sidebar-border bg-sidebar px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 space-y-4 px-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.href === "/dashboard" ? pathname === item.href : pathname?.startsWith(item.href)
                  const Icon = item.icon
                  return (
                    <Link key={item.href} href={item.href} className="relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
                      {active && (
                        <motion.div
                          layoutId="active-nav-pill"
                          className="absolute inset-0 rounded-lg bg-sidebar-accent"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <Icon
                        className={`relative z-10 h-4 w-4 ${active ? "text-sidebar-primary" : "text-sidebar-foreground/50"}`}
                        strokeWidth={1.75}
                      />
                      <span className={`relative z-10 ${active ? "font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/60"}`}>
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/60">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-sidebar-primary text-[11px] text-sidebar-primary-foreground">
                  {initials(session.fullName || session.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-sidebar-foreground">{session.email}</p>
                <p className="text-[11px] capitalize text-sidebar-foreground/50">{session.role}</p>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/60 px-8 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">{session.clientName}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="uppercase tracking-wide">
              {session.role}
            </Badge>
            {session.clientId && <NotificationBell clientId={session.clientId} />}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
