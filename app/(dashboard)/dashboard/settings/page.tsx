"use client"

import { useEffect, useState } from "react"
import { Hash, AtSign, User, Plus, History } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/lib/auth/use-session"
import { fetchWithAuth } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

function IntegrationRow({ icon: Icon, label, connected }: { icon: React.ElementType; label: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
          <Icon className="h-4 w-4 text-accent-foreground" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <Badge variant={connected ? "default" : "outline"}>{connected ? "Conectado" : "No conectado"}</Badge>
    </div>
  )
}

type IntegrationStatus = { connected: boolean; username: string | null }

function InstagramRow() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  async function load() {
    const res = await fetchWithAuth("/api/omni/integrations")
    const data = await res.json()
    setStatus(data.instagram ?? { connected: false, username: null })
  }

  useEffect(() => {
    load()
    const params = new URLSearchParams(window.location.search)
    if (params.get("connected") === "instagram") {
      toast.success("Instagram conectado")
      window.history.replaceState({}, "", window.location.pathname)
    }
    const err = params.get("instagram_error")
    if (err) {
      toast.error(`No se pudo conectar Instagram: ${err}`)
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  async function handleConnect() {
    setConnecting(true)
    const res = await fetchWithAuth("/api/omni/instagram/connect", { method: "POST" })
    const data = await res.json()
    setConnecting(false)
    if (!res.ok || !data.url) {
      toast.error(data.error ?? "No se pudo iniciar la conexión")
      return
    }
    window.location.href = data.url
  }

  async function handleSync() {
    setSyncing(true)
    const res = await fetchWithAuth("/api/omni/instagram/sync", { method: "POST" })
    const data = await res.json()
    setSyncing(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo sincronizar")
      return
    }
    toast.success(`Sincronizado: ${data.conversationsSynced} conversación(es), ${data.messagesSynced} mensaje(s)`)
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
          <AtSign className="h-4 w-4 text-accent-foreground" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-medium">Instagram</p>
          {status?.connected && status.username && <p className="text-xs text-muted-foreground">@{status.username}</p>}
        </div>
      </div>
      {status === null ? (
        <Badge variant="outline">Cargando…</Badge>
      ) : status.connected ? (
        <div className="flex items-center gap-2">
          <Badge>Conectado</Badge>
          <Button size="sm" variant="secondary" onClick={handleSync} disabled={syncing}>
            {syncing ? "Sincronizando…" : "Sincronizar ahora"}
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={handleConnect} disabled={connecting}>
          {connecting ? "Redirigiendo…" : "Conectar"}
        </Button>
      )}
    </div>
  )
}

type Member = { id: string; email: string; role: string; full_name: string | null }

function TeamSection() {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"admin" | "team" | "client">("team")
  const [inviting, setInviting] = useState(false)

  async function load() {
    const res = await fetchWithAuth("/api/omni/team")
    const data = await res.json()
    setMembers(data.members ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleInvite() {
    setInviting(true)
    const res = await fetchWithAuth("/api/omni/team", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo invitar")
      return
    }
    toast.success(`Invitación creada — compartile a ${email} la contraseña temporal`)
    setDialogOpen(false)
    setEmail("")
    setPassword("")
    load()
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">Equipo</CardTitle>
          <CardDescription>Quién tiene acceso a este cliente.</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm"><Plus /> Invitar</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar a alguien de tu equipo</DialogTitle>
              <DialogDescription>
                Se crea el acceso al toque — compartile la contraseña temporal manualmente (todavía no hay email automático).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input
                placeholder="Contraseña temporal (mín. 8 caracteres)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="team">Team</option>
                <option value="client">Client</option>
              </select>
            </div>
            <DialogFooter>
              <Button onClick={handleInvite} disabled={inviting || !email || !password}>
                {inviting ? "Creando…" : "Crear acceso"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {members === null ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{m.email}</p>
                <p className="text-xs text-muted-foreground">{m.full_name}</p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {m.role}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

type AuditLog = { id: string; action: string; resource: string; actor_email: string | null; created_at: string; metadata: Record<string, unknown> }

const ACTION_LABEL: Record<string, string> = {
  "client.created": "Cliente creado",
  "team_member.invited": "Invitó a un miembro del equipo",
}

function AuditSection() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null)

  useEffect(() => {
    fetchWithAuth("/api/omni/audit")
      .then((res) => res.json())
      .then((data) => setLogs(data.items ?? []))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Actividad</CardTitle>
        <CardDescription>Registro de cambios recientes en tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent>
        {logs === null ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((l) => (
              <div key={l.id} className="flex items-start gap-3 py-1">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <History className="h-3.5 w-3.5 text-accent-foreground" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{ACTION_LABEL[l.action] ?? l.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.actor_email ?? "Sistema"} · {new Date(l.created_at).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const { session } = useSession()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cuenta, equipo e integraciones.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <User className="h-4 w-4 text-accent-foreground" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium">{session?.email}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {session?.role} · {session?.clientName}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <TeamSection />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Integraciones</CardTitle>
          <CardDescription>Las fuentes que Omni lee para razonar sobre tu negocio.</CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationRow icon={Hash} label="Slack" connected={false} />
          <Separator />
          <InstagramRow />
        </CardContent>
      </Card>

      <AuditSection />
    </div>
  )
}
