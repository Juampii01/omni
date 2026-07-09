"use client"

import { useEffect, useRef, useState } from "react"
import { Paperclip, Plus, Send, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { COLUMNS, PRIORITIES, type Task } from "./constants"

type Comment = { id: string; body: string; author_id: string; created_at: string }
type Attachment = { id: string; file_name: string; url: string | null; created_at: string }

export function TaskModal({
  task,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: Task
  onClose: () => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
}) {
  const [description, setDescription] = useState(task.description)
  const [subtaskInput, setSubtaskInput] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [commentInput, setCommentInput] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchWithAuth(`/api/omni/tasks/${task.id}/comments`).then((r) => r.json()).then((d) => setComments(d.comments ?? []))
    fetchWithAuth(`/api/omni/tasks/${task.id}/attachments`).then((r) => r.json()).then((d) => setAttachments(d.attachments ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id])

  function handleDescriptionChange(value: string) {
    setDescription(value)
    if (descTimer.current) clearTimeout(descTimer.current)
    descTimer.current = setTimeout(() => onUpdate(task.id, { description: value }), 600)
  }

  function toggleSubtask(idx: number) {
    const next = task.subtasks.map((s, i) => (i === idx ? { ...s, done: !s.done } : s))
    onUpdate(task.id, { subtasks: next })
  }

  function addSubtask() {
    if (!subtaskInput.trim()) return
    onUpdate(task.id, { subtasks: [...task.subtasks, { text: subtaskInput.trim(), done: false }] })
    setSubtaskInput("")
  }

  function removeSubtask(idx: number) {
    onUpdate(task.id, { subtasks: task.subtasks.filter((_, i) => i !== idx) })
  }

  async function sendComment() {
    if (!commentInput.trim()) return
    const res = await fetchWithAuth(`/api/omni/tasks/${task.id}/comments`, { method: "POST", body: JSON.stringify({ body: commentInput }) })
    const data = await res.json()
    if (data.comment) setComments((prev) => [...prev, data.comment])
    setCommentInput("")
  }

  async function handleUpload(file: File) {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetchWithAuth(`/api/omni/tasks/${task.id}/attachments`, { method: "POST", body: formData as any })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo subir el archivo")
      return
    }
    setAttachments((prev) => [...prev, { ...data.attachment, url: null }])
    toast.success("Archivo subido")
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <input
              defaultValue={task.title}
              onBlur={(e) => onUpdate(task.id, { title: e.target.value })}
              className="w-full bg-transparent outline-none"
            />
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <Textarea placeholder="Descripción…" value={description} onChange={(e) => handleDescriptionChange(e.target.value)} rows={3} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Columna</label>
              <select
                value={task.column_id}
                onChange={(e) => onUpdate(task.id, { column_id: e.target.value })}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fecha límite</label>
              <Input type="date" value={task.due_date ?? ""} onChange={(e) => onUpdate(task.id, { due_date: e.target.value || null })} className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Prioridad</label>
            <div className="mt-1 flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onUpdate(task.id, { priority: p.id })}
                  className={`rounded-full border px-3 py-1 text-xs ${task.priority === p.id ? "border-transparent text-white" : "border-border text-muted-foreground"}`}
                  style={task.priority === p.id ? { backgroundColor: p.color } : {}}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Subtareas</label>
            <div className="mt-1 space-y-1.5">
              {task.subtasks.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(i)} />
                  <span className={`flex-1 text-sm ${s.done ? "text-muted-foreground line-through" : ""}`}>{s.text}</span>
                  <button onClick={() => removeSubtask(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                  placeholder="Nueva subtarea…"
                  className="h-8"
                />
                <Button size="icon-sm" variant="secondary" onClick={addSubtask}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Adjuntos</label>
            <div className="mt-1 space-y-1.5">
              {attachments.map((a) => (
                <a key={a.id} href={a.url ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs hover:bg-accent/50">
                  <Paperclip className="h-3.5 w-3.5" /> {a.file_name}
                </a>
              ))}
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                <Paperclip className="h-3.5 w-3.5" /> Subir archivo
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Comentarios</label>
            <div className="mt-1 space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-border/50 p-2.5 text-sm">
                  {c.body}
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendComment()} placeholder="Escribir un comentario…" className="h-8" />
                <Button size="icon-sm" variant="secondary" onClick={sendComment}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <Button variant="destructive" size="sm" onClick={() => { onDelete(task.id); onClose() }}>
            <Trash2 className="h-3.5 w-3.5" /> Eliminar tarea
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
