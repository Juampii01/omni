"use client"

import { useState, useEffect } from "react"
import { ImageIcon, Film, Loader2, CheckCircle, XCircle, ExternalLink, PlusCircle, Send, Clock } from "lucide-react"
import { IG_GRADIENT_CSS } from "./ig-theme"
import { toast } from "sonner"

type MediaType = "IMAGE" | "REEL"

interface Post {
  id: string
  mediaType: MediaType
  caption: string | null
  status: "PUBLISHED" | "PENDING" | "FAILED"
  permalink: string | null
  postId: string | null
  createdAt: string
  errorMessage?: string | null
}

function usePublishHistory() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const reload = () => {
    setLoading(true)
    fetch("/api/instagram/publish")
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => {
        setPosts((d.posts ?? []) as Post[])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  return { posts, loading, reload }
}

export function IGPublishPanel() {
  const [mediaType, setMediaType] = useState<MediaType>("REEL")
  const [mediaUrl, setMediaUrl] = useState("")
  const [caption, setCaption] = useState("")
  const [publishing, setPublishing] = useState(false)
  const { posts, loading, reload } = usePublishHistory()

  const todayCount = posts.filter((p) => {
    const d = new Date(p.createdAt)
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate() &&
      (p.status === "PUBLISHED" || p.status === "PENDING")
    )
  }).length
  const quotaPct = (todayCount / 25) * 100

  async function publish() {
    if (!mediaUrl.trim() || publishing) return
    setPublishing(true)
    try {
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaType, mediaUrl: mediaUrl.trim(), caption: caption.trim() || undefined }),
      })
      const data = (await res.json()) as { error?: string; detail?: string }
      if (!res.ok) {
        toast.error(data.detail ?? data.error ?? "Error al publicar")
      } else {
        toast.success("¡Publicado exitosamente!")
        setMediaUrl("")
        setCaption("")
        reload()
      }
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Publish form */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="px-5 pt-5 pb-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Nueva publicación</h3>

          {/* Media type selector */}
          <div className="flex gap-2 mb-4">
            {(["IMAGE", "REEL"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setMediaType(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  mediaType === type ? IG_GRADIENT_CSS + " text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {type === "IMAGE" ? <ImageIcon size={14} /> : <Film size={14} />}
                {type === "IMAGE" ? "Imagen" : "Reel / Video"}
              </button>
            ))}
          </div>

          {/* URL input */}
          <div className="mb-3">
            <label className="text-xs text-[var(--muted-foreground)] mb-1.5 block">URL del contenido (HTTPS)</label>
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={mediaType === "REEL" ? "https://... (MP4)" : "https://... (JPG/PNG)"}
              className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--muted-foreground)] transition-colors"
            />
          </div>

          {/* Caption */}
          <div className="mb-4">
            <label className="text-xs text-[var(--muted-foreground)] mb-1.5 flex items-center justify-between">
              <span>Caption</span>
              <span className={caption.length > 2000 ? "text-red-500" : ""}>{caption.length}/2200</span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={2200}
              placeholder="Escribí el caption de tu publicación..."
              className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--muted-foreground)] transition-colors resize-none"
            />
          </div>

          {/* Quota bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[var(--muted-foreground)]">Cuota diaria</span>
              <span className="text-xs font-semibold text-[var(--foreground)]">{todayCount}/25 hoy</span>
            </div>
            <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: quotaPct + "%", background: quotaPct > 80 ? "#FD1D1D" : "var(--foreground)" }} />
            </div>
          </div>

          <button
            onClick={() => void publish()}
            disabled={!mediaUrl.trim() || publishing || todayCount >= 25}
            className={`w-full h-11 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 ${IG_GRADIENT_CSS}`}
          >
            {publishing ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Publicando{mediaType === "REEL" ? " (puede tardar 30s)" : ""}...
              </>
            ) : (
              <>
                <PlusCircle size={16} /> Publicar en Instagram
              </>
            )}
          </button>
        </div>
      </div>

      {/* History */}
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
                      <span className="text-red-400 ml-1">· {post.errorMessage.slice(0, 40)}</span>
                    )}
                  </p>
                </div>
                {post.status === "PUBLISHED" && (post.permalink ?? post.postId) && (
                  <a
                    href={post.permalink ?? `https://www.instagram.com/p/${post.postId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex-shrink-0"
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
