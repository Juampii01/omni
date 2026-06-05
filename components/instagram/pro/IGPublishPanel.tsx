"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  ImageIcon,
  Film,
  Layers,
  Clapperboard,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  PlusCircle,
  UploadCloud,
  X,
  Clock,
  AlertCircle,
} from "lucide-react"
import { IG_GRADIENT_CSS } from "./ig-theme"
import { useInstagramPublish, type PublishType } from "@/hooks/useInstagramPublish"

interface Post {
  id: string
  mediaType: string
  caption: string | null
  status: "PUBLISHED" | "PENDING" | "FAILED"
  permalink: string | null
  postId: string | null
  createdAt: string
  errorMessage?: string | null
}

interface PublishLimit {
  quota_usage: number
  quota_total: number
}

function usePublishHistory() {
  const [posts, setPosts] = useState<Post[]>([])
  const [limit, setLimit] = useState<PublishLimit | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    fetch("/api/instagram/publish")
      .then((r) => (r.ok ? r.json() : { posts: [], limit: null }))
      .then((d) => {
        setPosts((d.posts ?? []) as Post[])
        setLimit((d.limit ?? null) as PublishLimit | null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { posts, limit, loading, reload }
}

// Config de cada tipo de publicación
const TYPES: { id: PublishType | "STORIES"; label: string; icon: React.ElementType; disabled?: boolean }[] = [
  { id: "IMAGE", label: "Imagen", icon: ImageIcon },
  { id: "REEL", label: "Reel", icon: Film },
  { id: "CAROUSEL", label: "Carrusel", icon: Layers },
  { id: "STORIES", label: "Stories", icon: Clapperboard, disabled: true },
]

function acceptFor(t: PublishType): string {
  if (t === "IMAGE") return "image/jpeg,image/png"
  if (t === "REEL") return "video/mp4,video/quicktime"
  return "image/jpeg,image/png,video/mp4,video/quicktime" // carrusel
}

export function IGPublishPanel() {
  const [mediaType, setMediaType] = useState<PublishType>("IMAGE")
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { state, publish, reset } = useInstagramPublish()
  const { posts, limit, loading, reload } = usePublishHistory()

  const limitReached = !!limit && limit.quota_usage >= limit.quota_total
  const busy = state.phase === "validating" || state.phase === "uploading" || state.phase === "publishing"

  // limpiar object URLs al cambiar
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previews])

  function clearFiles() {
    previews.forEach((u) => URL.revokeObjectURL(u))
    setFiles([])
    setPreviews([])
  }

  function onPick(list: FileList | null) {
    if (!list || list.length === 0) return
    const arr = Array.from(list)
    const next = mediaType === "CAROUSEL" ? arr.slice(0, 10) : arr.slice(0, 1)
    previews.forEach((u) => URL.revokeObjectURL(u))
    setFiles(next)
    setPreviews(next.map((f) => URL.createObjectURL(f)))
    if (state.phase === "error" || state.phase === "done") reset()
  }

  function switchType(t: PublishType) {
    setMediaType(t)
    clearFiles()
    reset()
  }

  async function handlePublish() {
    if (!files.length || busy || limitReached) return
    const ok = await publish({ mediaType, files, caption })
    if (ok) {
      clearFiles()
      setCaption("")
      reload()
    }
  }

  const canPublish =
    files.length > 0 &&
    !busy &&
    !limitReached &&
    (mediaType !== "CAROUSEL" || files.length >= 2)

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Form */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="px-5 pt-5 pb-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Nueva publicación</h3>

          {/* Tipo */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {TYPES.map(({ id, label, icon: Icon, disabled }) => {
              const active = !disabled && mediaType === id
              return (
                <button
                  key={id}
                  disabled={disabled}
                  onClick={() => !disabled && switchType(id as PublishType)}
                  title={disabled ? "Próximamente" : undefined}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? IG_GRADIENT_CSS + " text-white"
                      : disabled
                        ? "bg-[var(--muted)] text-[var(--muted-foreground)] opacity-50 cursor-not-allowed"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                  {disabled && <span className="text-[9px]">· pronto</span>}
                </button>
              )
            })}
          </div>

          {/* Dropzone / preview */}
          {files.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                onPick(e.dataTransfer.files)
              }}
              onClick={() => inputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragOver ? "border-[var(--foreground)] bg-[var(--muted)]/50" : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
              }`}
            >
              <UploadCloud size={28} className="mx-auto mb-2 text-[var(--muted-foreground)]" />
              <p className="text-sm text-[var(--foreground)]">Arrastrá tu archivo o hacé clic para elegir</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {mediaType === "IMAGE" && "JPG o PNG · máx 8MB · aspecto 0.8–1.91"}
                {mediaType === "REEL" && "MP4 o MOV · máx 100MB · 3–90s · vertical 9:16"}
                {mediaType === "CAROUSEL" && "2 a 10 imágenes/videos · JPG/PNG/MP4/MOV"}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={acceptFor(mediaType)}
                multiple={mediaType === "CAROUSEL"}
                className="hidden"
                onChange={(e) => onPick(e.target.files)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className={mediaType === "CAROUSEL" ? "grid grid-cols-3 gap-2" : ""}>
                {files.map((f, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden bg-[var(--muted)] border border-[var(--border)]">
                    {f.type.startsWith("video/") ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={previews[i]} className="w-full max-h-72 object-contain bg-black" controls={mediaType !== "CAROUSEL"} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previews[i]} alt="" className="w-full max-h-72 object-contain" />
                    )}
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {(f.size / 1048576).toFixed(1)}MB
                    </span>
                  </div>
                ))}
              </div>
              {!busy && (
                <button onClick={clearFiles} className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  <X size={12} /> Quitar {files.length > 1 ? `(${files.length})` : ""}
                </button>
              )}
            </div>
          )}

          {/* Caption */}
          <div className="mt-4 mb-4">
            <label className="text-xs text-[var(--muted-foreground)] mb-1.5 flex items-center justify-between">
              <span>Caption</span>
              <span className={caption.length > 2000 ? "text-red-500" : ""}>{caption.length}/2200</span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={2200}
              disabled={busy}
              placeholder="Escribí el caption…"
              className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--muted-foreground)] resize-none disabled:opacity-60"
            />
          </div>

          {/* Estado del proceso */}
          {state.phase === "uploading" && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="text-[var(--muted-foreground)]">
                  Subiendo {state.total > 1 ? `${state.index}/${state.total}` : "archivo"}…
                </span>
                <span className="font-semibold text-[var(--foreground)]">{state.progress}%</span>
              </div>
              <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                <div className={`h-full ${IG_GRADIENT_CSS} transition-all`} style={{ width: `${state.progress}%` }} />
              </div>
            </div>
          )}
          {state.phase === "validating" && (
            <p className="mb-4 text-xs text-[var(--muted-foreground)] flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Validando archivo…
            </p>
          )}
          {state.phase === "publishing" && (
            <p className="mb-4 text-xs text-[var(--muted-foreground)] flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Creando publicación y procesando en Instagram… (puede tardar para videos)
            </p>
          )}
          {state.phase === "error" && (
            <div className="mb-4 flex items-start gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{state.message}</span>
            </div>
          )}
          {state.phase === "done" && (
            <div className="mb-4 flex items-center gap-2 text-xs text-emerald-500">
              <CheckCircle size={13} /> ¡Publicado en Instagram!
            </div>
          )}

          {/* Cuota real */}
          {limit && (
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="text-[var(--muted-foreground)]">Cuota de Instagram (24h)</span>
              <span className={`font-semibold ${limitReached ? "text-red-500" : "text-[var(--foreground)]"}`}>
                {limit.quota_usage}/{limit.quota_total}
              </span>
            </div>
          )}

          <button
            onClick={handlePublish}
            disabled={!canPublish}
            className={`w-full h-11 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 ${IG_GRADIENT_CSS}`}
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Publicando…
              </>
            ) : limitReached ? (
              "Límite diario alcanzado"
            ) : (
              <>
                <PlusCircle size={16} /> Publicar en Instagram
              </>
            )}
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Historial reciente</h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--muted)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">No hay publicaciones aún</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {posts.slice(0, 10).map((post) => (
              <div key={post.id} className="flex items-center gap-3 px-5 py-3.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    post.status === "PUBLISHED" ? "bg-emerald-500/20" : post.status === "FAILED" ? "bg-red-500/20" : "bg-[var(--muted)]"
                  }`}
                >
                  {post.status === "PUBLISHED" ? (
                    <CheckCircle size={14} className="text-emerald-500" />
                  ) : post.status === "FAILED" ? (
                    <XCircle size={14} className="text-red-500" />
                  ) : (
                    <Clock size={14} className="text-[var(--muted-foreground)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--foreground)] truncate">
                    {post.caption ?? <span className="italic text-[var(--muted-foreground)]">Sin caption</span>}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(post.createdAt).toLocaleDateString("es-AR")} · {post.mediaType}
                    {post.status === "FAILED" && post.errorMessage && (
                      <span className="text-red-400 ml-1">· {post.errorMessage.slice(0, 50)}</span>
                    )}
                  </p>
                </div>
                {post.status === "PUBLISHED" && (post.permalink ?? post.postId) && (
                  <a
                    href={post.permalink ?? `https://www.instagram.com/p/${post.postId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex-shrink-0"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
