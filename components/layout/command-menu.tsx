"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  Hash,
  AtSign,
  BookOpen,
  Settings,
  SunMoon,
  Building2,
  FileText,
  ClipboardList,
  KanbanSquare,
  Lightbulb,
  Radio,
  CalendarDays,
  Zap,
} from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"

const PAGES = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/briefings", label: "Briefings", icon: Radio },
  { href: "/dashboard/community", label: "Comunidad", icon: Hash },
  { href: "/dashboard/conversations", label: "Conversaciones", icon: AtSign },
  { href: "/dashboard/mentor", label: "Mentor", icon: BookOpen },
  { href: "/dashboard/context", label: "Context Room", icon: Building2 },
  { href: "/dashboard/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/dashboard/content", label: "Contenido", icon: Lightbulb },
  { href: "/dashboard/docs", label: "Documentos", icon: FileText },
  { href: "/dashboard/sops", label: "SOPs", icon: ClipboardList },
  { href: "/dashboard/tasks", label: "Tareas", icon: KanbanSquare },
  { href: "/dashboard/automations", label: "Automatizaciones", icon: Zap },
  { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
]

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Buscar" description="Navegá o ejecutá una acción">
      <Command>
        <CommandInput placeholder="Buscar página o acción…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Navegación">
            {PAGES.map((p) => (
              <CommandItem key={p.href} onSelect={() => go(p.href)}>
                <p.icon />
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Acciones">
            <CommandItem onSelect={() => { setTheme(resolvedTheme === "dark" ? "light" : "dark"); setOpen(false) }}>
              <SunMoon />
              Cambiar tema
              <CommandShortcut>⌘K</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
