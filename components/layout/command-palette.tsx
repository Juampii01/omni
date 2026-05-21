"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Home, Users, BarChart2, Bot, Target, MessageSquare,
  FileText, Search, CheckSquare, Settings, TrendingUp,
  Kanban, Building2, Smartphone, Plug,
} from "lucide-react"

// ── Static pages ──────────────────────────────────────────────────────────────

const PAGES = [
  { href: "/",               label: "Inicio",            icon: Home },
  { href: "/crm",            label: "CRM — Leads",       icon: Users },
  { href: "/crm/pipeline",   label: "CRM — Pipeline",    icon: Kanban },
  { href: "/tasks",          label: "Tareas",             icon: CheckSquare },
  { href: "/team",           label: "Equipo",             icon: Users },
  { href: "/team/departments", label: "Departamentos",   icon: Building2 },
  { href: "/kpis",           label: "KPIs y Métricas",   icon: BarChart2 },
  { href: "/ai",             label: "Asistente IA",      icon: Bot },
  { href: "/competitors",    label: "Competidores",      icon: Target },
  { href: "/comms",          label: "Comunicación",      icon: MessageSquare },
  { href: "/content",        label: "Contenido",         icon: FileText },
  { href: "/discovery",      label: "Discovery",         icon: Search },
  { href: "/integrations",   label: "Integraciones",     icon: Plug },
  { href: "/mobile",         label: "App móvil",         icon: Smartphone },
  { href: "/settings",       label: "Configuración",     icon: Settings },
  { href: "/settings/branding",    label: "Branding",   icon: Settings },
  { href: "/settings/integrations", label: "Integraciones — Settings", icon: Plug },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type SearchResult = {
  id: string
  label: string
  subtitle: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState("")
  const [leads, setLeads] = useState<SearchResult[]>([])
  const [tasks, setTasks] = useState<SearchResult[]>([])
  const router = useRouter()

  // ── Shortcut Cmd+K / Ctrl+K ────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  // ── Live search ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) { setLeads([]); setTasks([]); return }
    if (query.trim().length < 2) { setLeads([]); setTasks([]); return }

    const sb = createClient() as any
    const like = `%${query}%`

    sb.from("leads")
      .select("id, full_name, stage, amount")
      .ilike("full_name", like)
      .is("deleted_at", null)
      .limit(5)
      .then(({ data }: { data: { id: string; full_name: string; stage: string; amount: number }[] | null }) => {
        setLeads(
          (data ?? []).map(l => ({
            id: l.id,
            label: l.full_name,
            subtitle: `Lead · $${Number(l.amount ?? 0).toLocaleString()}`,
            href: `/crm/${l.id}`,
            icon: Users,
          }))
        )
      })

    sb.from("tasks")
      .select("id, title, status")
      .ilike("title", like)
      .is("deleted_at", null)
      .limit(5)
      .then(({ data }: { data: { id: string; title: string; status: string }[] | null }) => {
        setTasks(
          (data ?? []).map(t => ({
            id: t.id,
            label: t.title,
            subtitle: `Tarea · ${t.status.replace("_", " ")}`,
            href: `/tasks`,
            icon: CheckSquare,
          }))
        )
      })
  }, [query, open])

  function navigate(href: string) {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  function onOpenChange(v: boolean) {
    setOpen(v)
    if (!v) setQuery("")
  }

  // Filter pages by query
  const filteredPages = query.trim().length >= 1
    ? PAGES.filter(p => p.label.toLowerCase().includes(query.toLowerCase()))
    : PAGES

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar páginas, leads, tareas…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Sin resultados para &ldquo;{query}&rdquo;</CommandEmpty>

        {filteredPages.length > 0 && (
          <CommandGroup heading="Páginas">
            {filteredPages.map(p => (
              <CommandItem key={p.href} value={p.href} onSelect={() => navigate(p.href)} className="gap-2 cursor-pointer">
                <p.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{p.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {leads.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Leads">
              {leads.map(l => (
                <CommandItem key={l.id} value={`lead-${l.id}`} onSelect={() => navigate(l.href)} className="gap-2 cursor-pointer">
                  <l.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm">{l.label}</span>
                    <span className="text-xs text-muted-foreground">{l.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tareas">
              {tasks.map(t => (
                <CommandItem key={t.id} value={`task-${t.id}`} onSelect={() => navigate(t.href)} className="gap-2 cursor-pointer">
                  <t.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm">{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
