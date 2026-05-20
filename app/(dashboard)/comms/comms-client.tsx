"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Pencil, Trash2, Pin, PinOff, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────
type Announcement = {
  id: string
  title: string
  body: string | null
  is_pinned: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

type ProfileEntry = { full_name: string | null; email: string }

type AnnouncementForm = {
  title: string
  body: string
  is_pinned: boolean
}

const EMPTY_FORM: AnnouncementForm = { title: "", body: "", is_pinned: false }

// ── Relative time helper ───────────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "ayer"
  if (days < 30) return `hace ${days} días`
  const months = Math.floor(days / 30)
  if (months === 1) return "hace 1 mes"
  if (months < 12) return `hace ${months} meses`
  return `hace ${Math.floor(months / 12)} año${Math.floor(months / 12) > 1 ? "s" : ""}`
}

// ── Announcement Dialog ────────────────────────────────────────────────────────
function AnnouncementDialog({
  open,
  editing,
  userId,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: Announcement | null
  userId: string
  onClose: () => void
  onSaved: (a: Announcement) => void
}) {
  const [form, setForm] = useState<AnnouncementForm>(() =>
    editing
      ? { title: editing.title, body: editing.body ?? "", is_pinned: editing.is_pinned }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)

  function set<K extends keyof AnnouncementForm>(k: K, v: AnnouncementForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error("El título es obligatorio"); return }
    setSaving(true)
    const sb = (createClient() as any)
    const payload = {
      title: form.title.trim(),
      body: form.body.trim() || null,
      is_pinned: form.is_pinned,
      created_by: userId,
    }
    let data: Announcement | null = null
    let error: any = null
    if (editing) {
      const r = await sb.from("announcements").update(payload).eq("id", editing.id).select().single()
      data = r.data; error = r.error
    } else {
      const r = await sb.from("announcements").insert(payload).select().single()
      data = r.data; error = r.error
    }
    setSaving(false)
    if (error) { toast.error(error.message ?? "Error al guardar"); return }
    toast.success(editing ? "Anuncio actualizado" : "Anuncio publicado")
    onSaved(data as Announcement)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar anuncio" : "Nuevo anuncio"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Título *</Label>
            <Input
              id="ann-title"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="Título del anuncio"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-body">Mensaje</Label>
            <Textarea
              id="ann-body"
              value={form.body}
              onChange={e => set("body", e.target.value)}
              rows={4}
              placeholder="Escribí el contenido del anuncio…"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="ann-pinned"
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-[hsl(var(--brand))] cursor-pointer"
              checked={form.is_pinned}
              onChange={e => set("is_pinned", e.target.checked)}
            />
            <Label htmlFor="ann-pinned" className="cursor-pointer font-normal">
              Fijar este anuncio
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-hover">
              {saving ? "Guardando…" : editing ? "Guardar" : "Publicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Announcement Card ──────────────────────────────────────────────────────────
function AnnouncementCard({
  announcement,
  profiles,
  userId,
  isAdmin,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  announcement: Announcement
  profiles: Record<string, ProfileEntry>
  userId: string
  isAdmin: boolean
  onEdit: (a: Announcement) => void
  onDelete: (id: string) => void
  onTogglePin: (a: Announcement) => void
}) {
  const author = announcement.created_by ? profiles[announcement.created_by] : null
  const authorName = author?.full_name || author?.email || "Equipo"
  const canManage = isAdmin || announcement.created_by === userId

  return (
    <Card
      className={cn(
        "border-border shadow-sm transition-shadow hover:shadow-md",
        announcement.is_pinned && "border-l-4 border-l-[hsl(var(--brand))]"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-snug">
              {announcement.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {announcement.is_pinned && (
              <Badge variant="secondary" className="text-[11px] gap-1 py-0.5 px-1.5">
                <Pin className="h-2.5 w-2.5" />
                Fijado
              </Badge>
            )}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Opciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-sm">
                  <DropdownMenuItem onClick={() => onTogglePin(announcement)}>
                    {announcement.is_pinned ? (
                      <><PinOff className="h-3.5 w-3.5 mr-2" />Desfijar</>
                    ) : (
                      <><Pin className="h-3.5 w-3.5 mr-2" />Fijar</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(announcement)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(announcement.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {announcement.body && (
          <CardDescription className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {announcement.body}
          </CardDescription>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">{authorName}</span>
          <span>·</span>
          <span>{relativeTime(announcement.created_at)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function CommsClient({
  initialAnnouncements,
  profiles,
  userId,
  isAdmin,
}: {
  initialAnnouncements: Announcement[]
  profiles: Record<string, ProfileEntry>
  userId: string
  isAdmin: boolean
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(a: Announcement) { setEditing(a); setDialogOpen(true) }

  function handleSaved(a: Announcement) {
    setAnnouncements(prev => {
      const idx = prev.findIndex(x => x.id === a.id)
      let updated: Announcement[]
      if (idx >= 0) {
        updated = [...prev]
        updated[idx] = a
      } else {
        updated = [a, ...prev]
      }
      // Re-sort: pinned first, then by created_at desc
      return updated.sort((x, y) => {
        if (x.is_pinned !== y.is_pinned) return x.is_pinned ? -1 : 1
        return new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
      })
    })
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este anuncio?")) return
    const sb = (createClient() as any)
    const { error } = await sb.from("announcements").delete().eq("id", id)
    if (error) { toast.error("No se pudo eliminar"); return }
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    toast.success("Anuncio eliminado")
  }

  async function handleTogglePin(a: Announcement) {
    const sb = (createClient() as any)
    const { data, error } = await sb
      .from("announcements")
      .update({ is_pinned: !a.is_pinned })
      .eq("id", a.id)
      .select()
      .single()
    if (error) { toast.error("No se pudo actualizar"); return }
    handleSaved(data as Announcement)
    toast.success(a.is_pinned ? "Anuncio desfijado" : "Anuncio fijado")
  }

  const pinned = announcements.filter(a => a.is_pinned)
  const rest = announcements.filter(a => !a.is_pinned)

  const cardProps = {
    profiles,
    userId,
    isAdmin,
    onEdit: openEdit,
    onDelete: handleDelete,
    onTogglePin: handleTogglePin,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicaciones"
        description="Anuncios y novedades del equipo"
      >
        <Button onClick={openCreate} className="bg-brand hover:bg-brand-hover">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo anuncio
        </Button>
      </PageHeader>

      {announcements.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mb-4">
              <Megaphone className="h-6 w-6 text-brand" />
            </div>
            <p className="text-sm font-medium">Todavía no hay anuncios</p>
            <p className="text-xs text-muted-foreground mt-1">
              ¡Creá el primero para mantener al equipo informado!
            </p>
            <Button onClick={openCreate} className="mt-4 bg-brand hover:bg-brand-hover">
              <Plus className="h-4 w-4 mr-2" />
              Crear primer anuncio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Fijados
                </h2>
              </div>
              <div className="space-y-3">
                {pinned.map(a => (
                  <AnnouncementCard key={a.id} announcement={a} {...cardProps} />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section className="space-y-3">
              {pinned.length > 0 && (
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recientes
                </h2>
              )}
              <div className="space-y-3">
                {rest.map(a => (
                  <AnnouncementCard key={a.id} announcement={a} {...cardProps} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <AnnouncementDialog
        open={dialogOpen}
        editing={editing}
        userId={userId}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
