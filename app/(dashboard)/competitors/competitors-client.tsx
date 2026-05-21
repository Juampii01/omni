"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ExternalLink, Binoculars, Instagram, Music2, Youtube } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { PaginationControls } from "@/components/pagination-controls"

// ── Types ─────────────────────────────────────────────────────────────────────

type Competitor = {
  id: string
  name: string
  category: string | null
  instagram_handle: string | null
  tiktok_handle: string | null
  youtube_handle: string | null
  website_url: string | null
  notes: string | null
  tags: string[]
  added_by: string | null
  created_at: string
  updated_at: string
}

type CompetitorForm = {
  name: string
  category: string
  instagram_handle: string
  tiktok_handle: string
  youtube_handle: string
  website_url: string
  notes: string
  tags: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_FORM: CompetitorForm = {
  name: "",
  category: "",
  instagram_handle: "",
  tiktok_handle: "",
  youtube_handle: "",
  website_url: "",
  notes: "",
  tags: "",
}

function formatDate(dateStr: string) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function ensureHttps(url: string) {
  if (!url) return url
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return "https://" + url
}

// ── Competitor Card ───────────────────────────────────────────────────────────

function CompetitorCard({
  competitor,
  onEdit,
  onDelete,
}: {
  competitor: Competitor
  onEdit: (c: Competitor) => void
  onDelete: (id: string) => void
}) {
  const socials: { Icon: React.ComponentType<{ className?: string }>; label: string; url: string }[] = []

  if (competitor.instagram_handle) {
    socials.push({
      Icon: Instagram,
      label: `@${competitor.instagram_handle}`,
      url: `https://instagram.com/${competitor.instagram_handle}`,
    })
  }
  if (competitor.tiktok_handle) {
    socials.push({
      Icon: Music2,
      label: `@${competitor.tiktok_handle}`,
      url: `https://tiktok.com/@${competitor.tiktok_handle}`,
    })
  }
  if (competitor.youtube_handle) {
    socials.push({
      Icon: Youtube,
      label: `@${competitor.youtube_handle}`,
      url: `https://youtube.com/@${competitor.youtube_handle}`,
    })
  }

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight truncate">{competitor.name}</p>
          {competitor.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1.5">
              {competitor.category}
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(competitor)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(competitor.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col flex-1 gap-3">
        {/* Social handles */}
        {socials.length > 0 && (
          <div className="flex flex-col gap-1">
            {socials.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <s.Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{s.label}</span>
              </a>
            ))}
          </div>
        )}

        {/* Website */}
        {competitor.website_url && (
          <a
            href={ensureHttps(competitor.website_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-[180px]">
              {competitor.website_url.replace(/^https?:\/\//, "")}
            </span>
          </a>
        )}

        {/* Notes */}
        {competitor.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">{competitor.notes}</p>
        )}

        {/* Tags */}
        {competitor.tags && competitor.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {competitor.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer date */}
        <p className="text-xs text-muted-foreground mt-auto pt-1">
          Añadido {formatDate(competitor.created_at)}
        </p>
      </CardContent>
    </Card>
  )
}

// ── Competitor Dialog ─────────────────────────────────────────────────────────

function CompetitorDialog({
  open,
  editing,
  userId,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: Competitor | null
  userId: string
  onClose: () => void
  onSaved: (c: Competitor) => void
}) {
  const [form, setForm] = useState<CompetitorForm>(() =>
    editing
      ? {
          name: editing.name,
          category: editing.category ?? "",
          instagram_handle: editing.instagram_handle ?? "",
          tiktok_handle: editing.tiktok_handle ?? "",
          youtube_handle: editing.youtube_handle ?? "",
          website_url: editing.website_url ?? "",
          notes: editing.notes ?? "",
          tags: (editing.tags ?? []).join(", "),
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)

  const set = (k: keyof CompetitorForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    setSaving(true)

    const sb = createClient() as any
    const tagsArray = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      instagram_handle: form.instagram_handle.trim().replace(/^@/, "") || null,
      tiktok_handle: form.tiktok_handle.trim().replace(/^@/, "") || null,
      youtube_handle: form.youtube_handle.trim().replace(/^@/, "") || null,
      website_url: form.website_url.trim() || null,
      notes: form.notes.trim() || null,
      tags: tagsArray,
      updated_at: new Date().toISOString(),
    }

    let data: any
    let error: any

    if (editing) {
      const r = await sb.from("competitors").update(payload).eq("id", editing.id).select().single()
      data = r.data
      error = r.error
    } else {
      const r = await sb
        .from("competitors")
        .insert({ ...payload, added_by: userId })
        .select()
        .single()
      data = r.data
      error = r.error
    }

    setSaving(false)
    if (error) {
      toast.error(error.message ?? "Error al guardar")
      return
    }
    toast.success(editing ? "Competidor actualizado" : "Competidor añadido")
    onSaved(data as Competitor)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar competidor" : "Nuevo competidor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ej: MarcaX"
                required
                autoFocus
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Categoría</Label>
              <Input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Ej: Indumentaria, SaaS, Agencia…"
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Redes sociales</p>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5 text-muted-foreground" /> Instagram
                </Label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 h-9 rounded-l-md border border-r-0 border-border bg-muted text-sm text-muted-foreground">
                    @
                  </span>
                  <Input
                    className="rounded-l-none"
                    value={form.instagram_handle}
                    onChange={(e) => set("instagram_handle", e.target.value.replace(/^@/, ""))}
                    placeholder="handle"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Music2 className="h-3.5 w-3.5 text-muted-foreground" /> TikTok
                </Label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 h-9 rounded-l-md border border-r-0 border-border bg-muted text-sm text-muted-foreground">
                    @
                  </span>
                  <Input
                    className="rounded-l-none"
                    value={form.tiktok_handle}
                    onChange={(e) => set("tiktok_handle", e.target.value.replace(/^@/, ""))}
                    placeholder="handle"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Youtube className="h-3.5 w-3.5 text-muted-foreground" /> YouTube
                </Label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 h-9 rounded-l-md border border-r-0 border-border bg-muted text-sm text-muted-foreground">
                    @
                  </span>
                  <Input
                    className="rounded-l-none"
                    value={form.youtube_handle}
                    onChange={(e) => set("youtube_handle", e.target.value.replace(/^@/, ""))}
                    placeholder="handle"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sitio web</Label>
            <Input
              value={form.website_url}
              onChange={(e) => set("website_url", e.target.value)}
              placeholder="https://ejemplo.com"
              type="url"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Fortalezas, debilidades, diferenciadores…"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <Input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="premium, ecommerce, local (separados por coma)"
            />
            <p className="text-[11px] text-muted-foreground">Separados por coma</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-hover">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Nuevo competidor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

interface Pagination {
  page: number; totalCount: number; totalPages: number; pageSize: number
}

export function CompetitorsClient({
  initialCompetitors,
  userId,
  pagination,
}: {
  initialCompetitors: Competitor[]
  userId: string
  pagination: Pagination
}) {
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Competitor | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return competitors
    const q = search.toLowerCase()
    return competitors.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
    )
  }, [competitors, search])

  const categoriesCount = useMemo(
    () => new Set(competitors.map((c) => c.category).filter(Boolean)).size,
    [competitors]
  )

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(c: Competitor) {
    setEditing(c)
    setDialogOpen(true)
  }

  function handleSaved(c: Competitor) {
    setCompetitors((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = c
        return next.sort((a, b) => a.name.localeCompare(b.name))
      }
      return [...prev, c].sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  function requestDelete(id: string) {
    setDeleteTarget(id)
    setConfirmOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setConfirmOpen(false)
    setDeleteTarget(null)
    const sb = createClient() as any
    const { error } = await sb.from("competitors").delete().eq("id", id)
    if (error) {
      toast.error("No se pudo eliminar")
      return
    }
    setCompetitors((prev) => prev.filter((c) => c.id !== id))
    toast.success("Competidor eliminado")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competidores"
        description={`${competitors.length} competidor${competitors.length !== 1 ? "es" : ""} registrado${competitors.length !== 1 ? "s" : ""}`}
      >
        <Button onClick={openCreate} className="bg-brand hover:bg-brand-hover">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo competidor
        </Button>
      </PageHeader>

      {/* Stats row */}
      {competitors.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 max-w-sm">
          {[
            { label: "Total", value: competitors.length },
            { label: "Categorías", value: categoriesCount },
          ].map(({ label, value }) => (
            <Card key={label} className="border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      {competitors.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, categoría o tag…"
            className="pl-9 h-8 text-sm"
          />
        </div>
      )}

      {/* Grid / empty state */}
      {filtered.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-4">
              <Binoculars className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {competitors.length === 0 ? "Todavía no hay competidores" : "Sin resultados"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {competitors.length === 0
                ? "Creá tu primer competidor para empezar a hacer seguimiento."
                : "Probá con otro término de búsqueda."}
            </p>
            {competitors.length === 0 && (
              <Button onClick={openCreate} className="mt-4 bg-brand hover:bg-brand-hover">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer competidor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <CompetitorCard
              key={c.id}
              competitor={c}
              onEdit={openEdit}
              onDelete={requestDelete}
            />
          ))}
        </div>
      )}

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalCount={pagination.totalCount}
        pageSize={pagination.pageSize}
        buildHref={p => `/competitors?page=${p}`}
      />

      <CompetitorDialog
        open={dialogOpen}
        editing={editing}
        userId={userId}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar competidor?"
        description="Esta acción no se puede deshacer."
        onConfirm={handleDelete}
      />
    </div>
  )
}
