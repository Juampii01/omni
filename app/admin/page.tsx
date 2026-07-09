"use client"

import { useEffect, useState } from "react"
import { Plus, Users, Building2 } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

type ClientRow = {
  id: string
  name: string
  business_name: string | null
  mentor_name: string | null
  created_at: string
  memberCount: number
  leadCount: number
}

export default function AdminPage() {
  const [clients, setClients] = useState<ClientRow[] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [clientName, setClientName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ownerPassword, setOwnerPassword] = useState("")
  const [creating, setCreating] = useState(false)

  async function load() {
    const res = await fetchWithAuth("/api/admin/clients")
    const data = await res.json()
    setClients(data.clients ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate() {
    setCreating(true)
    const res = await fetchWithAuth("/api/admin/clients", {
      method: "POST",
      body: JSON.stringify({ clientName, ownerEmail, ownerPassword }),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo crear el cliente")
      return
    }
    toast.success(`Cliente "${clientName}" creado`)
    setDialogOpen(false)
    setClientName("")
    setOwnerEmail("")
    setOwnerPassword("")
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Todos los tenants de Omni.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus /> Crear cliente
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear cliente nuevo</DialogTitle>
              <DialogDescription>Se crea el tenant y su primer usuario owner.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nombre del cliente/negocio" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              <Input placeholder="Email del owner" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
              <Input
                placeholder="Contraseña (mín. 8 caracteres)"
                type="password"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={creating || !clientName || !ownerEmail || !ownerPassword}>
                {creating ? "Creando…" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {clients === null ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay clientes creados.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {clients.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base">{c.business_name || c.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {c.memberCount} miembro(s)
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" /> {c.leadCount} leads
                </div>
                <p className="text-xs text-muted-foreground">
                  Creado el {new Date(c.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
