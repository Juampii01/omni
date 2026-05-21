"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { UserPlus, MoreHorizontal, UserCheck, UserX, Shield, ArrowLeft } from "lucide-react"
import { getInitials } from "@/lib/utils"
import { ROLE_LABELS } from "@/lib/constants"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: "owner" | "admin" | "manager" | "team"
  department_id: string | null
  is_active: boolean
  last_seen_at: string | null
  created_at: string
}

type Department = { id: string; name: string; color: string }

const ROLE_COLORS: Record<Member["role"], string> = {
  owner: "bg-purple-50 text-purple-700 border-purple-200",
  admin: "bg-blue-50 text-blue-700 border-blue-200",
  manager: "bg-amber-50 text-amber-700 border-amber-200",
  team: "bg-secondary text-secondary-foreground",
}

function formatLastSeen(dateStr: string | null) {
  if (!dateStr) return "Nunca"
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays} días`
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
}

// ── Invite Dialog ─────────────────────────────────────────────────────────────

function InviteDialog({
  open,
  departments,
  onClose,
  onInvited,
}: {
  open: boolean
  departments: Department[]
  onClose: () => void
  onInvited: () => void
}) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "manager" | "team">("team")
  const [departmentId, setDepartmentId] = useState("none")
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        role,
        department_id: departmentId === "none" ? null : departmentId,
      }),
    })
    setSending(false)
    if (!res.ok) {
      const { error } = await res.json()
      toast.error(error ?? "No se pudo enviar la invitación")
      return
    }
    toast.success(`Invitación enviada a ${email}`)
    setEmail("")
    setRole("team")
    setDepartmentId("none")
    onInvited()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar miembro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@empresa.com"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {departments.length > 0 && (
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Se enviará un email de invitación. El usuario deberá aceptarla para acceder.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={sending} className="bg-brand hover:bg-brand-hover">
              {sending ? "Enviando…" : "Enviar invitación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Role change dialog ────────────────────────────────────────────────────────

function RoleDialog({
  open,
  member,
  departments,
  onClose,
  onSaved,
}: {
  open: boolean
  member: Member | null
  departments: Department[]
  onClose: () => void
  onSaved: (updated: Partial<Member> & { id: string }) => void
}) {
  const [role, setRole] = useState<Member["role"]>(member?.role ?? "team")
  const [departmentId, setDepartmentId] = useState(member?.department_id ?? "none")
  const [saving, setSaving] = useState(false)

  if (!member) return null

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const payload = {
      role,
      department_id: departmentId === "none" ? null : departmentId,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("profiles").update(payload).eq("id", member!.id)
    setSaving(false)
    if (error) { toast.error("No se pudo actualizar"); return }
    toast.success("Perfil actualizado")
    onSaved({ id: member!.id, ...payload })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar {member.full_name ?? member.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {departments.length > 0 && (
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Select value={departmentId ?? "none"} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-brand-hover">
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TeamClient({
  initialMembers,
  departments,
}: {
  initialMembers: Member[]
  departments: Department[]
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleDialogMember, setRoleDialogMember] = useState<Member | null>(null)

  async function toggleActive(member: Member) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ is_active: !member.is_active })
      .eq("id", member.id)
    if (error) { toast.error("No se pudo actualizar"); return }
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, is_active: !m.is_active } : m))
    )
    toast.success(member.is_active ? "Miembro desactivado" : "Miembro activado")
  }

  function handleRoleSaved(updated: Partial<Member> & { id: string }) {
    setMembers((prev) =>
      prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
    )
  }

  const active = members.filter((m) => m.is_active)
  const inactive = members.filter((m) => !m.is_active)

  function MemberRow({ member }: { member: Member }) {
    const dept = departments.find((d) => d.id === member.department_id)
    return (
      <TableRow className={!member.is_active ? "opacity-50" : ""}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {member.avatar_url && <AvatarImage src={member.avatar_url} />}
              <AvatarFallback className="text-xs bg-brand-soft text-brand">
                {getInitials(member.full_name ?? member.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {(member.full_name && !member.full_name.includes("@")) ? member.full_name : <span className="text-muted-foreground italic">Sin nombre</span>}
              </p>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[member.role]}`}>
            {ROLE_LABELS[member.role]}
          </span>
        </TableCell>
        <TableCell>
          {dept ? (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: dept.color + "20", color: dept.color }}
            >
              {dept.name}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatLastSeen(member.last_seen_at)}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRoleDialogMember(member)}>
                <Shield className="h-4 w-4 mr-2" />
                Editar rol y dept.
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleActive(member)}>
                {member.is_active ? (
                  <><UserX className="h-4 w-4 mr-2" />Desactivar</>
                ) : (
                  <><UserCheck className="h-4 w-4 mr-2" />Activar</>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Equipo" description={`${active.length} miembro${active.length !== 1 ? "s" : ""} activo${active.length !== 1 ? "s" : ""}`}>
        <div className="flex items-center gap-2">
          <Link href="/team/departments">
            <Button variant="outline" size="sm">Departamentos</Button>
          </Link>
          <Button onClick={() => setInviteOpen(true)} className="bg-brand hover:bg-brand-hover">
            <UserPlus className="h-4 w-4 mr-2" />
            Invitar
          </Button>
        </div>
      </PageHeader>

      <Card className="border-border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Miembro</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Última actividad</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((m) => <MemberRow key={m.id} member={m} />)}
            {inactive.map((m) => <MemberRow key={m.id} member={m} />)}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                  No hay miembros todavía
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <InviteDialog
        open={inviteOpen}
        departments={departments}
        onClose={() => setInviteOpen(false)}
        onInvited={() => {}}
      />

      <RoleDialog
        open={!!roleDialogMember}
        member={roleDialogMember}
        departments={departments}
        onClose={() => setRoleDialogMember(null)}
        onSaved={handleRoleSaved}
      />
    </div>
  )
}
