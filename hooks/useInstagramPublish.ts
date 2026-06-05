"use client"

import { useCallback, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export type MediaKind = "IMAGE" | "REEL" | "VIDEO"
export type PublishType = "IMAGE" | "REEL" | "CAROUSEL"

export type PublishState =
  | { phase: "idle" }
  | { phase: "validating" }
  | { phase: "uploading"; progress: number; index: number; total: number }
  | { phase: "publishing" } // container + processing + publish (server-side)
  | { phase: "done"; postId: string | null }
  | { phase: "error"; message: string }

const IMG_TYPES = ["image/jpeg", "image/png"]
const VID_TYPES = ["video/mp4", "video/quicktime"]
const MAX_IMG = 8 * 1024 * 1024
const MAX_VID = 100 * 1024 * 1024
const BUCKET = "instagram-uploads"

// ── Lectura de metadata del archivo (client-side, para validar antes de subir) ──
function readImageMeta(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("No se pudo leer la imagen"))
    }
    img.src = url
  })
}

function readVideoMeta(file: File): Promise<{ w: number; h: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement("video")
    v.preload = "metadata"
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve({ w: v.videoWidth, h: v.videoHeight, duration: v.duration })
    }
    v.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("No se pudo leer el video"))
    }
    v.src = url
  })
}

/** Valida un archivo antes de subir. Devuelve null si está OK, o el mensaje de error. */
export async function validateMedia(file: File, kind: MediaKind): Promise<string | null> {
  if (kind === "IMAGE") {
    if (!IMG_TYPES.includes(file.type)) return "Formato no válido — usá JPG o PNG."
    if (file.size > MAX_IMG) return `La imagen pesa ${(file.size / 1048576).toFixed(1)}MB (máx 8MB).`
    const { w, h } = await readImageMeta(file)
    const ar = w / h
    if (ar < 0.8 || ar > 1.91) return `Relación de aspecto ${ar.toFixed(2)} fuera de rango (0.8–1.91).`
    return null
  }
  if (kind === "REEL") {
    if (!VID_TYPES.includes(file.type)) return "Formato no válido — usá MP4 o MOV."
    if (file.size > MAX_VID) return `El video pesa ${(file.size / 1048576).toFixed(0)}MB (máx 100MB).`
    const { w, h, duration } = await readVideoMeta(file)
    if (duration < 3 || duration > 90) return `Duración ${Math.round(duration)}s fuera de rango (3–90s).`
    if (w / h > 1.0) return "El reel debe ser vertical (relación 9:16)."
    if (w < 540) return `Resolución baja (${w}px de ancho, mínimo 540).`
    return null
  }
  // VIDEO (item de carrusel) — validación más laxa
  if (!VID_TYPES.includes(file.type)) return "Formato no válido — usá MP4 o MOV."
  if (file.size > MAX_VID) return `El video pesa ${(file.size / 1048576).toFixed(0)}MB (máx 100MB).`
  return null
}

// ── Upload a Supabase Storage con progreso real (XHR) ──────────
async function uploadToStorage(file: File, onProgress: (pct: number) => void): Promise<string> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  if (!accessToken) throw new Error("Sesión expirada — volvé a iniciar sesión.")

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const ext = (file.name.split(".").pop() || "bin").toLowerCase()
  const path = `${session?.user?.id ?? "anon"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const endpoint = `${base}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", endpoint)
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
    xhr.setRequestHeader("x-upsert", "true")
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else {
        console.error(`[publish] storage upload ${xhr.status}: ${xhr.responseText}`)
        reject(new Error(`No se pudo subir el archivo (${xhr.status}).`))
      }
    }
    xhr.onerror = () => reject(new Error("Error de red subiendo el archivo."))
    xhr.send(file)
  })

  return `${base}/storage/v1/object/public/${BUCKET}/${path}`
}

export function useInstagramPublish() {
  const [state, setState] = useState<PublishState>({ phase: "idle" })

  const reset = useCallback(() => setState({ phase: "idle" }), [])

  const publish = useCallback(
    async (opts: { mediaType: PublishType; files: File[]; caption: string }): Promise<boolean> => {
      const { mediaType, files, caption } = opts
      try {
        // 1) Validación (fail fast)
        setState({ phase: "validating" })
        const itemTypes: ("IMAGE" | "VIDEO")[] = []
        for (const f of files) {
          const kind: MediaKind =
            mediaType === "REEL" ? "REEL" : mediaType === "IMAGE" ? "IMAGE" : f.type.startsWith("video/") ? "VIDEO" : "IMAGE"
          const err = await validateMedia(f, kind)
          if (err) {
            setState({ phase: "error", message: err })
            return false
          }
          itemTypes.push(f.type.startsWith("video/") ? "VIDEO" : "IMAGE")
        }

        // 2) Upload a Storage (con progreso)
        const urls: string[] = []
        for (let i = 0; i < files.length; i++) {
          setState({ phase: "uploading", progress: 0, index: i + 1, total: files.length })
          const url = await uploadToStorage(files[i], (pct) =>
            setState({ phase: "uploading", progress: pct, index: i + 1, total: files.length }),
          )
          urls.push(url)
        }

        // 3) Publicar (server-side: container + polling + publish)
        setState({ phase: "publishing" })
        const res = await fetch("/api/instagram/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaType,
            mediaUrls: urls,
            itemTypes: mediaType === "CAROUSEL" ? itemTypes : undefined,
            caption: caption.trim() || undefined,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string; post?: { postId?: string } }
        if (!res.ok) {
          setState({ phase: "error", message: data.detail ?? data.error ?? "No se pudo publicar." })
          return false
        }
        setState({ phase: "done", postId: data.post?.postId ?? null })
        return true
      } catch (e) {
        setState({ phase: "error", message: e instanceof Error ? e.message : String(e) })
        return false
      }
    },
    [],
  )

  return { state, publish, reset }
}
