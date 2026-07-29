"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Compass, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { formatDayMonthYear } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

type SessionRow = {
  id: string
  prospect_name: string
  niche: string | null
  status: "in_progress" | "completed" | "archived"
  converted_client_id: string | null
  updated_at: string
}

const STATUS_LABEL: Record<SessionRow["status"], string> = {
  in_progress: "En curso",
  completed: "Completa",
  archived: "Archivada",
}

export default function DiscoveryListPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [prospectName, setProspectName] = useState("")
  const [niche, setNiche] = useState("")
  const [creating, setCreating] = useState(false)

  async function load() {
    const res = await fetchWithAuth("/api/admin/discovery")
    const data = await res.json()
    setSessions(data.items ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate() {
    setCreating(true)
    const res = await fetchWithAuth("/api/admin/discovery", {
      method: "POST",
      body: JSON.stringify({ prospectName, niche: niche || undefined }),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo crear la sesión")
      return
    }
    setDialogOpen(false)
    setProspectName("")
    setNiche("")
    router.push(`/admin/discovery/${data.item.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Descubrimiento</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entrevistas de descubrimiento con IA para prospectos nuevos — interno, nunca lo ve el cliente.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus /> Nueva sesión
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva sesión de descubrimiento</DialogTitle>
              <DialogDescription>Arranca una entrevista con IA para entender qué necesita este prospecto.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nombre del prospecto/negocio" value={prospectName} onChange={(e) => setProspectName(e.target.value)} />
              <Input placeholder="Nicho (opcional)" value={niche} onChange={(e) => setNiche(e.target.value)} />
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={creating || !prospectName.trim()}>
                {creating ? "Creando…" : "Crear y empezar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sessions === null ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay sesiones de descubrimiento.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {sessions.map((s) => (
            <Card key={s.id} className="cursor-pointer transition-colors hover:bg-accent/40" onClick={() => router.push(`/admin/discovery/${s.id}`)}>
              <CardHeader className="flex-row items-start justify-between">
                <CardTitle className="text-base">{s.prospect_name}</CardTitle>
                <Badge variant={s.status === "completed" ? "default" : "outline"}>{STATUS_LABEL[s.status]}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {s.niche && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Compass className="h-3.5 w-3.5" /> {s.niche}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Última actividad: {formatDayMonthYear(new Date(s.updated_at))}</p>
                {s.converted_client_id && <p className="text-xs text-primary">Ya se convirtió en cliente</p>}
                <Button variant="outline" size="sm" className="w-full">
                  Abrir <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
