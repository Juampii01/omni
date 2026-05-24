"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Instagram, Plus, Calendar, Clock, CheckCircle2, XCircle,
  Loader2, Image, Film, Layers, Trash2, ExternalLink, Users,
  TrendingUp, Eye, Heart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow, isPast } from "date-fns"
import { es } from "date-fns/locale"

// ── Types ─────────────────────────────────────────────────────────────────────

type IGAccount = {
  id: string
  username: string
  profile_picture_url?: string
  followers_count?: number
  ig_user_id: string
  token_expires_at?: string
}

type QueueItem = {
  id: string
  account_id: string
  media_type: "IMAGE" | "VIDEO" | "REEL" | "CAROUSEL"
  caption?: string
  media_urls: string[]
  cover_url?: string
  scheduled_for: string
  publish_now: boolean
  status: "pending" | "processing" | "published" | "failed" | "cancelled"
  ig_media_id?: string
  published_at?: string
  attempt_count: number
  last_error?: string
  created_at: string
}

type IGMedia = {
  id: string
  ig_media_id: string
  media_type: string
  media_url?: string
  thumbnail_url?: string
  caption?: string
  timestamp: string
  like_count?: number
  comments_count?: number
  reach?: number
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<QueueItem["status"], { label: string; icon: typeof CheckCircle2; className: string }> = {
  pending:    { label: "Pendiente",  icon: Clock,        className: "text-amber-400" },
  processing: { label: "Publicando", icon: Loader2,      className: "text-blue-400 animate-spin" },
  published:  { label: "Publicado",  icon: CheckCircle2, className: "text-emerald-500" },
  failed:     { label: "Falló",      icon: XCircle,      className: "text-red-500" },
  cancelled:  { label: "Cancelado",  icon: XCircle,      className: "text-muted-foreground" },
}

const MEDIA_TYPE_CFG = {
  IMAGE:    { label: "Imagen",   icon: Image,  emoji: "🖼" },
  VIDEO:    { label: "Video",    icon: Film,   emoji: "🎬" },
  REEL:     { label: "Reel",     icon: Film,   emoji: "🎥" },
  CAROUSEL: { label: "Carrusel", icon: Layers, emoji: "🎠" },
}

// ── Compose Dialog ────────────────────────────────────────────────────────────

function ComposeDialog({
  open, accounts, onClose, onAdded,
}: {
  open: boolean
  accounts: IGAccount[]
  onClose: () => void
  onAdded: (q: QueueItem) => void
}) {
  const [form, setForm] = useState({
    account_id:    accounts[0]?.id ?? "",
    media_type:    "IMAGE" as QueueItem["media_type"],
    caption:       "",
    media_url:     "",    // primary media URL
    cover_url:     "",    // for REELs
    scheduled_for: "",
    publish_now:   false,
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.account_id) { toast.error("Seleccioná una cuenta"); return }
    if (!form.media_url.trim()) { toast.error("La URL del medio es obligatoria"); return }
    if (!form.publish_now && !form.scheduled_for) { toast.error("Elegí cuándo publicar"); return }

    setSaving(true)
    const sb = createClient() as any

    const scheduledFor = form.publish_now
      ? new Date().toISOString()
      : new Date(form.scheduled_for).toISOString()

    const payload: any = {
      account_id:    form.account_id,
      media_type:    form.media_type,
      caption:       form.caption.trim() || null,
      media_urls:    [form.media_url.trim()],
      cover_url:     form.cover_url.trim() || null,
      scheduled_for: scheduledFor,
      publish_now:   form.publish_now,
      status:        "pending",
    }

    const { data, error } = await sb
      .from("instagram_publish_queue")
      .insert(payload)
      .select()
      .single()

    setSaving(false)
    if (error) { toast.error(error.message ?? "Error al agregar a la cola"); return }
    toast.success("Post agregado a la cola de publicación")
    onAdded(data as QueueItem)
    onClose()
  }

  // Tomorrow 10:00 local as default
  const defaultSchedule = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(10, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {accounts.length > 1 && (
            <div className="space-y-1.5">
              <Label>Cuenta</Label>
              <Select value={form.account_id} onValueChange={v => set("account_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>@{a.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Tipo de contenido</Label>
            <Select value={form.media_type} onValueChange={v => set("media_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MEDIA_TYPE_CFG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>URL del medio *</Label>
            <Input
              value={form.media_url}
              onChange={e => set("media_url", e.target.value)}
              placeholder="https://... (imagen o video públicamente accesible)"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Debe ser una URL pública. Para Supabase Storage, usá una URL firmada.
            </p>
          </div>

          {(form.media_type === "REEL" || form.media_type === "VIDEO") && (
            <div className="space-y-1.5">
              <Label>URL del thumbnail (cover)</Label>
              <Input
                value={form.cover_url}
                onChange={e => set("cover_url", e.target.value)}
                placeholder="https://... (thumbnail para el reel)"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Caption</Label>
            <Textarea
              value={form.caption}
              onChange={e => set("caption", e.target.value)}
              rows={3}
              placeholder="Escribí el caption con hashtags y emojis..."
              maxLength={2200}
            />
            <p className="text-[10px] text-muted-foreground text-right">{form.caption.length}/2200</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.publish_now}
                onChange={e => set("publish_now", e.target.checked)}
                className="accent-brand h-4 w-4"
              />
              <span className="text-sm font-medium">Publicar ahora</span>
            </label>

            {!form.publish_now && (
              <div className="space-y-1.5">
                <Label>Programar para</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_for || defaultSchedule()}
                  onChange={e => set("scheduled_for", e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand/90">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</> : "Agregar a cola"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Queue item row ────────────────────────────────────────────────────────────

function QueueRow({
  item, onCancel,
}: {
  item: QueueItem
  onCancel: () => void
}) {
  const cfg      = STATUS_CFG[item.status]
  const typeCfg  = MEDIA_TYPE_CFG[item.media_type]
  const Icon     = cfg.icon
  const overdue  = item.status === "pending" && isPast(new Date(item.scheduled_for))

  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 space-y-2",
      overdue ? "border-amber-500/30" : "border-border",
    )}>
      <div className="flex items-start gap-3">
        {/* Media preview / type */}
        {item.media_urls[0]
          ? (
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.media_urls[0]} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-xl">
              {typeCfg.emoji}
            </div>
          )
        }

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">{typeCfg.label}</span>
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", cfg.className)}>
              <Icon className="h-3 w-3" />
              {cfg.label}
            </span>
            {overdue && <span className="text-[10px] text-amber-400 font-medium">⚠ vencido</span>}
          </div>

          {item.caption && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {item.caption}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(item.scheduled_for), "d MMM yyyy HH:mm", { locale: es })}
            </span>
            {item.attempt_count > 0 && (
              <span>{item.attempt_count} intento{item.attempt_count > 1 ? "s" : ""}</span>
            )}
          </div>

          {item.last_error && (
            <p className="text-[10px] text-red-400 mt-1 line-clamp-1">{item.last_error}</p>
          )}
        </div>

        {item.status === "pending" && (
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={onCancel}
            title="Cancelar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}

        {item.ig_media_id && (
          <a
            href={`https://www.instagram.com/p/${item.ig_media_id}/`}
            target="_blank" rel="noopener noreferrer"
            className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-brand flex-shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

// ── No account state ──────────────────────────────────────────────────────────

function NoAccountState() {
  return (
    <div className="rounded-xl border border-border bg-card p-12 text-center">
      <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
        <Instagram className="h-7 w-7 text-brand" />
      </div>
      <h3 className="text-base font-semibold mb-2">Conectá tu Instagram</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Para publicar, programar posts y ver métricas reales, primero conectá tu cuenta de Instagram Business.
      </p>
      <Button asChild className="bg-brand hover:bg-brand/90">
        <a href="/api/instagram/oauth/start">
          <Instagram className="h-4 w-4 mr-2" />
          Conectar Instagram
        </a>
      </Button>
      <p className="text-[10px] text-muted-foreground mt-4">
        Requiere una cuenta de Instagram Business o Creator vinculada a una página de Facebook.
      </p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function InstagramClient({
  accounts,
  queue: initialQueue,
  recentMedia,
}: {
  accounts: IGAccount[]
  queue: QueueItem[]
  recentMedia: IGMedia[]
}) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue)
  const [composeOpen, setComposeOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const hasAccount = accounts.length > 0

  async function handleCancel() {
    if (!confirmCancel) return
    const id = confirmCancel
    setConfirmCancel(null)
    const sb = createClient() as any
    const { error } = await sb
      .from("instagram_publish_queue")
      .update({ status: "cancelled" })
      .eq("id", id)
    if (error) { toast.error("No se pudo cancelar"); return }
    setQueue(prev => prev.map(q => q.id === id ? { ...q, status: "cancelled" as const } : q))
    toast.success("Post cancelado")
  }

  const pending   = queue.filter(q => q.status === "pending" || q.status === "processing")
  const failed    = queue.filter(q => q.status === "failed")
  const cancelled = queue.filter(q => q.status === "cancelled")

  return (
    <div className="space-y-6">
      <PageHeader title="Instagram" description={hasAccount ? `@${accounts[0].username}` : "Sin cuenta conectada"} icon={Instagram}>
        {hasAccount && (
          <Button onClick={() => setComposeOpen(true)} className="bg-brand hover:bg-brand/90">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo post
          </Button>
        )}
      </PageHeader>

      {!hasAccount ? (
        <NoAccountState />
      ) : (
        <>
          {/* Account info + stats */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={accounts[0].profile_picture_url ?? undefined} />
                <AvatarFallback className="bg-brand/10 text-brand font-bold">
                  {accounts[0].username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">@{accounts[0].username}</p>
                <div className="flex items-center gap-4 mt-1">
                  {accounts[0].followers_count != null && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {accounts[0].followers_count.toLocaleString("en-US")} seguidores
                    </span>
                  )}
                  {accounts[0].token_expires_at && (
                    <span className="text-xs text-muted-foreground">
                      Token expira {formatDistanceToNow(new Date(accounts[0].token_expires_at), { addSuffix: true, locale: es })}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`https://instagram.com/${accounts[0].username}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Ver perfil
                </a>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="queue">
            <TabsList className="h-9">
              <TabsTrigger value="queue" className="text-xs">
                Cola de publicación
                {pending.length > 0 && (
                  <span className="ml-1.5 bg-brand text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="published" className="text-xs">
                Publicados ({recentMedia.length})
              </TabsTrigger>
            </TabsList>

            {/* Queue tab */}
            <TabsContent value="queue" className="mt-4 space-y-4">
              {pending.length === 0 && failed.length === 0 && cancelled.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-5 w-5 text-brand" />
                  </div>
                  <p className="text-sm font-medium">La cola está vacía</p>
                  <p className="text-xs text-muted-foreground mt-1">Creá un nuevo post para programarlo.</p>
                  <Button onClick={() => setComposeOpen(true)} className="mt-4 bg-brand hover:bg-brand/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo post
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.length > 0 && (
                    <>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Pendientes ({pending.length})
                      </h3>
                      {pending.map(item => (
                        <QueueRow
                          key={item.id}
                          item={item}
                          onCancel={() => setConfirmCancel(item.id)}
                        />
                      ))}
                    </>
                  )}
                  {failed.length > 0 && (
                    <>
                      <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide mt-4">
                        Fallidos ({failed.length})
                      </h3>
                      {failed.map(item => (
                        <QueueRow
                          key={item.id}
                          item={item}
                          onCancel={() => setConfirmCancel(item.id)}
                        />
                      ))}
                    </>
                  )}
                  {cancelled.length > 0 && (
                    <>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                        Cancelados ({cancelled.length})
                      </h3>
                      <div className="opacity-50">
                        {cancelled.map(item => (
                          <QueueRow key={item.id} item={item} onCancel={() => {}} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Published / media tab */}
            <TabsContent value="published" className="mt-4">
              {recentMedia.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center">
                  <p className="text-sm text-muted-foreground">Sin posts sincronizados todavía.</p>
                  <p className="text-xs text-muted-foreground mt-1">El sync corre diariamente a las 8am UTC.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {recentMedia.map(m => (
                    <a
                      key={m.id}
                      href={`https://instagram.com/p/${m.ig_media_id}/`}
                      target="_blank" rel="noopener noreferrer"
                      className="group relative rounded-xl overflow-hidden bg-muted aspect-square border border-border hover:border-brand/30 transition-colors"
                    >
                      {(m.media_url || m.thumbnail_url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.thumbnail_url ?? m.media_url}
                          alt={m.caption?.slice(0, 40) ?? ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <div className="flex items-center gap-3 text-white text-[10px]">
                          {m.like_count != null && (
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />{m.like_count}
                            </span>
                          )}
                          {m.reach != null && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />{m.reach}
                            </span>
                          )}
                        </div>
                      </div>
                      {m.media_type === "REEL" && (
                        <div className="absolute top-2 right-2">
                          <Film className="h-4 w-4 text-white drop-shadow" />
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <ComposeDialog
        open={composeOpen}
        accounts={accounts}
        onClose={() => setComposeOpen(false)}
        onAdded={item => setQueue(prev => [item, ...prev])}
      />
      <ConfirmDialog
        open={!!confirmCancel}
        onOpenChange={v => !v && setConfirmCancel(null)}
        title="¿Cancelar publicación?"
        description="El post no se publicará. Podés crear uno nuevo en cualquier momento."
        onConfirm={handleCancel}
      />
    </div>
  )
}
