"use client"

import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Target, Loader2, Sparkles, ChevronDown, ChevronUp, Users } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Client = { id: string; full_name: string; company?: string; instagram_handle?: string; tier: string }
type ContentCalendar = { weekly_structure?: string; content_pillars?: string[]; monthly_themes?: string[] }
type Strategy = {
  id: string
  client_id: string
  version: number
  created_at: string
  prospecting_angles?: string
  communication_angles?: string
  content_calendar?: ContentCalendar
  offer_structure?: string
  sales_approach?: string
  landing_page_copy?: string
  closing_angles?: string
  tokens_used?: number
}

const COACH_MAP_TABS = [
  { key: "prospecting_angles",    label: "Prospección",    emoji: "🎯" },
  { key: "communication_angles",  label: "Comunicación",   emoji: "💬" },
  { key: "content_calendar",      label: "Calendario",     emoji: "📅" },
  { key: "offer_structure",       label: "Oferta",         emoji: "💎" },
  { key: "sales_approach",        label: "Sales",          emoji: "🤝" },
  { key: "landing_page_copy",     label: "Landing",        emoji: "🚀" },
  { key: "closing_angles",        label: "Cierre",         emoji: "🔑" },
]

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

function TextBlock({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <div className="space-y-1.5 text-sm text-muted-foreground leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        if (line.startsWith("## ")) return <h3 key={i} className="text-sm font-semibold text-foreground mt-3">{line.slice(3)}</h3>
        if (line.startsWith("- ") || line.startsWith("• ")) {
          const content = line.slice(2)
          const parts = content.split(/\*\*(.*?)\*\*/g)
          return (
            <li key={i} className="ml-4 list-disc">
              {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-foreground">{p}</strong> : p)}
            </li>
          )
        }
        const parts = line.split(/\*\*(.*?)\*\*/g)
        return (
          <p key={i}>
            {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-foreground">{p}</strong> : p)}
          </p>
        )
      })}
    </div>
  )
}

function CalendarBlock({ data }: { data: ContentCalendar }) {
  return (
    <div className="space-y-4 text-sm">
      {data.weekly_structure && (
        <div>
          <p className="font-semibold text-foreground mb-1">Estructura semanal</p>
          <p className="text-muted-foreground">{data.weekly_structure}</p>
        </div>
      )}
      {data.content_pillars && data.content_pillars.length > 0 && (
        <div>
          <p className="font-semibold text-foreground mb-2">Pilares de contenido</p>
          <div className="flex flex-wrap gap-2">
            {data.content_pillars.map((p, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-brand/10 text-brand border border-brand/20 text-xs font-medium">{p}</span>
            ))}
          </div>
        </div>
      )}
      {data.monthly_themes && data.monthly_themes.length > 0 && (
        <div>
          <p className="font-semibold text-foreground mb-2">Temas mensuales</p>
          <div className="space-y-1.5">
            {data.monthly_themes.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-brand font-mono text-xs mt-0.5 w-5 flex-shrink-0">M{i + 1}</span>
                <span className="text-muted-foreground text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StrategyCard({
  strategy, client, defaultOpen,
}: {
  strategy: Strategy
  client?: Client
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <Card className={cn("border-border transition-colors", open && "border-brand/20")}>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-semibold">
                {client?.full_name ?? "Cliente"}
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">v{strategy.version}</Badge>
              {client?.tier && (
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                  client.tier === "vip" ? "bg-amber-400/10 text-amber-400 border-amber-400/30" :
                  client.tier === "premium" ? "bg-brand/10 text-brand border-brand/30" :
                  "bg-muted text-muted-foreground border-border"
                )}>{client.tier.toUpperCase()}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generado el {fmtDate(strategy.created_at)}
              {strategy.tokens_used && ` · ${strategy.tokens_used.toLocaleString()} tokens`}
            </p>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="border-t border-border pt-4">
          <Tabs defaultValue="prospecting_angles">
            <TabsList className="flex-wrap h-auto gap-1 mb-4">
              {COACH_MAP_TABS.map(tab => (
                <TabsTrigger key={tab.key} value={tab.key} className="text-xs gap-1">
                  <span>{tab.emoji}</span>{tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {COACH_MAP_TABS.map(tab => (
              <TabsContent key={tab.key} value={tab.key}>
                {tab.key === "content_calendar" ? (
                  strategy.content_calendar
                    ? <CalendarBlock data={strategy.content_calendar} />
                    : <p className="text-sm text-muted-foreground">Sin datos</p>
                ) : (
                  strategy[tab.key as keyof Strategy]
                    ? <TextBlock text={String(strategy[tab.key as keyof Strategy])} />
                    : <p className="text-sm text-muted-foreground">Sin datos generados para esta sección.</p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}

export function StrategyClient({
  clients,
  initialStrategies,
}: {
  clients: Client[]
  initialStrategies: Strategy[]
}) {
  const [strategies, setStrategies] = useState<Strategy[]>(initialStrategies)
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    if (!selectedClientId) { toast.error("Seleccioná un cliente"); return }
    setGenerating(true)

    try {
      const res = await fetch("/api/strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Error generando estrategia")
        return
      }

      const { strategy } = await res.json()
      setStrategies(prev => [strategy, ...prev])
      toast.success("CoachMap generado correctamente")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setGenerating(false)
    }
  }

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estrategia · CoachMap"
        description="7 outputs estratégicos por cliente: prospección, comunicación, calendario, oferta, sales, landing y cierre."
        icon={Target}
      />

      {/* Generator */}
      <Card className="border-border">
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <p className="text-sm font-medium">Generar nuevo CoachMap</p>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un cliente activo..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <SelectItem value="_none" disabled>Sin clientes activos</SelectItem>
                  ) : (
                    clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}{c.company ? ` — ${c.company}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedClientId}
              className="bg-brand hover:bg-brand/90 sm:w-auto w-full"
            >
              {generating
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando (~30s)...</>
                : <><Sparkles className="h-4 w-4 mr-2" />Generar CoachMap</>}
            </Button>
          </div>
          {clients.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Primero agregá clientes activos en la sección Clientes.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Past strategies */}
      {strategies.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-brand" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Sin estrategias generadas</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Seleccioná un cliente y generá su CoachMap completo con IA.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {strategies.length} {strategies.length === 1 ? "estrategia generada" : "estrategias generadas"}
          </p>
          {strategies.map((s, i) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              client={clientMap[s.client_id]}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
