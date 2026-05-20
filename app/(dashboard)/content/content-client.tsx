"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Pencil, Trash2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type ContentStatus = "idea" | "draft" | "review" | "scheduled" | "published"
type ContentPlatform = "instagram" | "tiktok" | "youtube" | "twitter" | "linkedin"
type ContentFormat = "reel" | "post" | "story" | "video" | "article" | "thread" | "carousel"

type ContentPiece = {
  id: string
  title: string
  description: string | null
  format: ContentFormat | null
  platform: ContentPlatform | null
  status: ContentStatus
  scheduled_for: string | null
  published_at: string | null
  url: string | null
  tags: string[] | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type ContentForm = {
  title: string
  description: string
  format: string
  platform: string
  status: ContentStatus
  scheduled_for: string
  url: string
  tags: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES: ContentStatus[] = ["idea", "draft", "review", "scheduled", "published"]

const STATUS_CONFIG: Record<ContentStatus, { label: string; className: string }> = {
  idea:      { label: "Idea",       className: "bg-gray-100 text-gray-600 border-gray-200" },
  draft:     { label: "Borrador",   className: "bg-blue-50 text-blue-700 border-blue-200" },
  review:    { label: "Revisión",   className: "bg-amber-50 text-amber-700 border-amber-200" },
  scheduled: { label: "Programado", className: "bg-purple-50 text-purple-700 border-purple-200" },
  published: { label: "Publicado",  className: "bg-green-50 text-green-700 border-green-200" },
}

const PLATFORMS: { value: ContentPlatform; label: string; icon: string }[] = [
  { value: "instagram", label: "Instagram",  icon: "📸" },
  { value: "tiktok",    label: "TikTok",     icon: "🎵" },
  { value: "youtube",   label: "YouTube",    icon: "📺" },
  { value: "twitter",   label: "Twitter/X",  icon: "🐦" },
  { value: "linkedin",  label: "LinkedIn",   icon: "💼" },
]

const FORMATS: { value: ContentFormat; label: string }[] = [
  { value: "reel",     label: "Reel" },
  { value: "post",     label: "Post" },
  { value: "story",    label: "Story" },
  { value: "video",    label: "Video" },
  { value: "article",  label: "Artículo" },
  { value: "thread",   label: "Thread" },
  { value: "carousel", label: "Carrusel" },
]

const EMPTY_FORM: ContentForm = {
  title: "",
  description: "",
  format: "none",
  platform: "none",
  status: "idea",
  scheduled_for: "",
  url: "",
  tags: "",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function platformIcon(platform: ContentPlatform | null): string {
  return PLATFORMS.find((p) => p.value === platform)?.icon ?? "🌐"
}

function platformLabel(platform: ContentPlatform | null): string {
  return PLATFORMS.find((p) => p.value === platform)?.label ?? "—"
}

function formatLabel(format: ContentFormat | null): string {
  return FORMATS.find((f) => f.value === format)?.label ?? "—"
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

// ── Status Summary Bar ────────────────────────────────────────────────────────

function StatusSummary({ pieces }: { pieces: ContentPiece[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {STATUSES.map((status) => {
        const count = pieces.filter((p) => p.status === status).length
        const cfg = STATUS_CONFIG[status]
        return (
          <div key={status} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
                cfg.className
              )}
            >
              {cfg.label}
              <span className="font-bold tabular-nums">{count}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Content Dialog ────────────────────────────────────────────────────────────

function ContentDialog({
  open,
  editing,
  userId,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: ContentPiece | null
  userId: string
  onClose: () => void
  onSaved: (piece: ContentPiece) => void
}) {
  const [form, setForm] = useState<ContentForm>(() =>
    editing
      ? {
          title:          editing.title,
          description:    editing.description ?? "",
          format:         editing.format ?? "none",
          platform:       editing.platform ?? "none",
          status:         editing.status,
          scheduled_for:  editing.scheduled_for ? editing.scheduled_for.slice(0, 16) : "",
          url:            editing.url ?? "",
          tags:           (editing.tags ?? []).join(", "),
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)

  const set = (k: keyof ContentForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error("El título es obligatorio")
      return
    }
    setSaving(true)
    const sb = createClient() as any

    const rawTags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    const payload = {
      title:         form.title.trim(),
      description:   form.description.trim() || null,
      format:        form.format === "none" ? null : (form.format as ContentFormat),
      platform:      form.platform === "none" ? null : (form.platform as ContentPlatform),
      status:        form.status,
      scheduled_for: form.scheduled_for || null,
      url:           form.url.trim() || null,
      tags:          rawTags.length > 0 ? rawTags : null,
      updated_at:    new Date().toISOString(),
    }

    let data: any
    let error: any

    if (editing) {
      const res = await sb
        .from("content_pieces")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single()
      data = res.data
      error = res.error
    } else {
      const res = await sb
        .from("content_pieces")
        .insert({ ...payload, created_by: userId })
        .select()
        .single()
      data = res.data
      error = res.error
    }

    setSaving(false)
    if (error) {
      toast.error(error.message ?? "Error al guardar")
      return
    }
    toast.success(editing ? "Contenido actualizado" : "Contenido creado")
    onSaved(data as ContentPiece)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar contenido" : "Nuevo contenido"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Título del contenido"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Descripción, guión o idea principal…"
            />
          </div>

          {/* Platform + Format */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={(v) => set("platform", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin plataforma</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.icon} {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Formato</Label>
              <Select value={form.format} onValueChange={(v) => set("format", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin formato</SelectItem>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status + Scheduled */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as ContentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Programado para</Label>
              <Input
                type="datetime-local"
                value={form.scheduled_for}
                onChange={(e) => set("scheduled_for", e.target.value)}
              />
            </div>
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input
              type="url"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://…"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <Input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="marketing, producto, otoño (separados por coma)"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-hover">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear contenido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

export function ContentClient({
  initialContent,
  userId,
}: {
  initialContent: ContentPiece[]
  userId: string
}) {
  const [pieces, setPieces] = useState<ContentPiece[]>(initialContent)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ContentPiece | null>(null)
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [filterFormat, setFilterFormat]     = useState<string>("all")
  const [filterStatus, setFilterStatus]     = useState<string>("all")

  const filtered = useMemo(() => {
    return pieces.filter((p) => {
      if (filterPlatform !== "all" && p.platform !== filterPlatform) return false
      if (filterFormat   !== "all" && p.format   !== filterFormat)   return false
      if (filterStatus   !== "all" && p.status   !== filterStatus)   return false
      return true
    })
  }, [pieces, filterPlatform, filterFormat, filterStatus])

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(piece: ContentPiece) {
    setEditing(piece)
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este contenido?")) return
    const sb = createClient() as any
    const { error } = await sb.from("content_pieces").delete().eq("id", id)
    if (error) { toast.error("No se pudo eliminar"); return }
    setPieces((prev) => prev.filter((p) => p.id !== id))
    toast.success("Contenido eliminado")
  }

  function handleSaved(piece: ContentPiece) {
    setPieces((prev) => {
      const idx = prev.findIndex((p) => p.id === piece.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = piece
        return next
      }
      return [piece, ...prev]
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contenido"
        description={`${pieces.length} piezas en el calendario`}
      >
        <Button onClick={openCreate} className="bg-brand hover:bg-brand-hover">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo contenido
        </Button>
      </PageHeader>

      {/* Status summary bar */}
      {pieces.length > 0 && (
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <StatusSummary pieces={pieces} />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {pieces.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las plataformas</SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.icon} {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterFormat} onValueChange={setFilterFormat}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Formato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los formatos</SelectItem>
              {FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table / Empty state */}
      {filtered.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center mb-4">
              <FileText className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm font-medium">
              {pieces.length === 0 ? "Todavía no hay contenido" : "Sin resultados"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pieces.length === 0
                ? "Creá tu primera pieza para organizar el calendario de contenido."
                : "Probá cambiando los filtros."}
            </p>
            {pieces.length === 0 && (
              <Button onClick={openCreate} className="mt-4 bg-brand hover:bg-brand-hover">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer contenido
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Programado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((piece) => (
                <TableRow key={piece.id} className="hover:bg-muted/40">
                  <TableCell className="max-w-xs">
                    <p className="text-sm font-medium truncate">{piece.title}</p>
                    {piece.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {piece.description}
                      </p>
                    )}
                    {piece.tags && piece.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {piece.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                        {piece.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{piece.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {piece.platform ? (
                      <span className="text-sm">
                        {platformIcon(piece.platform)}{" "}
                        <span className="text-xs text-muted-foreground">
                          {platformLabel(piece.platform)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {piece.format ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {formatLabel(piece.format)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full border font-medium",
                        STATUS_CONFIG[piece.status].className
                      )}
                    >
                      {STATUS_CONFIG[piece.status].label}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {formatDate(piece.scheduled_for)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(piece)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(piece.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ContentDialog
        open={dialogOpen}
        editing={editing}
        userId={userId}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
