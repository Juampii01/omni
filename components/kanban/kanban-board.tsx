"use client"

import { useEffect, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"
import { createClient } from "@/lib/supabase"
import { COLUMNS, type Task } from "./constants"
import { KanbanColumn } from "./kanban-column"
import { TaskCard } from "./task-card"
import { TaskModal } from "./task-modal"

export function KanbanBoard({ clientId }: { clientId: string }) {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [modalTask, setModalTask] = useState<Task | null>(null)
  const isDraggingRef = useRef(false)
  const snapshotRef = useRef<Task[]>([])
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<Task[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function load() {
    const res = await fetchWithAuth("/api/omni/tasks")
    const data = await res.json()
    setTasks(data.tasks ?? [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`kanban_tasks_${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kanban_tasks", filter: `client_id=eq.${clientId}` },
        (payload) => {
          if (isDraggingRef.current) return
          if (payload.eventType === "DELETE") {
            setTasks((prev) => (prev ?? []).filter((t) => t.id !== (payload.old as any).id))
            return
          }
          const incoming = payload.new as Task
          setTasks((prev) => {
            const list = prev ?? []
            const exists = list.some((t) => t.id === incoming.id)
            return exists ? list.map((t) => (t.id === incoming.id ? incoming : t)) : [...list, incoming]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId])

  function handleDragStart(e: DragStartEvent) {
    isDraggingRef.current = true
    snapshotRef.current = tasks ?? []
    setActiveTask((tasks ?? []).find((t) => t.id === e.active.id) ?? null)
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const overColumn = COLUMNS.some((c) => c.id === over.id) ? (over.id as string) : (tasks ?? []).find((t) => t.id === over.id)?.column_id
    if (!overColumn) return
    setTasks((prev) =>
      (prev ?? []).map((t) => (t.id === active.id && t.column_id !== overColumn ? { ...t, column_id: overColumn } : t))
    )
  }

  function handleDragEnd(e: DragEndEvent) {
    isDraggingRef.current = false
    setActiveTask(null)
    const { active, over } = e
    if (!over) return

    const current = tasks ?? []
    const activeTaskNow = current.find((t) => t.id === active.id)
    if (!activeTaskNow) return

    const columnId = activeTaskNow.column_id
    const columnTasks = current.filter((t) => t.column_id === columnId)
    const oldIndex = columnTasks.findIndex((t) => t.id === active.id)
    const overIsColumn = COLUMNS.some((c) => c.id === over.id)
    const newIndex = overIsColumn ? columnTasks.length - 1 : columnTasks.findIndex((t) => t.id === over.id)

    const reordered = [...columnTasks]
    reordered.splice(oldIndex, 1)
    reordered.splice(Math.max(newIndex, 0), 0, activeTaskNow)
    const withOrder = reordered.map((t, i) => ({ ...t, order: i }))

    const merged = current.map((t) => withOrder.find((w) => w.id === t.id) ?? t)
    setTasks(merged)

    const original = snapshotRef.current
    const changed = merged.filter((t) => {
      const orig = original.find((o) => o.id === t.id)
      return !orig || orig.column_id !== t.column_id || orig.order !== t.order
    })
    if (changed.length > 0) scheduleReorder(changed)
  }

  function scheduleReorder(changed: Task[]) {
    pendingRef.current = [...pendingRef.current.filter((c) => !changed.some((n) => n.id === c.id)), ...changed]
    if (reorderTimer.current) clearTimeout(reorderTimer.current)
    reorderTimer.current = setTimeout(async () => {
      const changes = pendingRef.current.map((t) => ({ id: t.id, columnId: t.column_id, order: t.order }))
      pendingRef.current = []
      await fetchWithAuth("/api/omni/tasks/reorder", { method: "POST", body: JSON.stringify({ changes }) })
    }, 300)
  }

  async function handleQuickAdd(columnId: string, title: string) {
    const res = await fetchWithAuth("/api/omni/tasks", { method: "POST", body: JSON.stringify({ title, columnId }) })
    const data = await res.json()
    if (data.task) setTasks((prev) => [...(prev ?? []), data.task])
  }

  async function handleUpdate(id: string, patch: Partial<Task>) {
    setTasks((prev) => (prev ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)))
    setModalTask((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev))
    await fetchWithAuth(`/api/omni/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
  }

  async function handleDelete(id: string) {
    setTasks((prev) => (prev ?? []).filter((t) => t.id !== id))
    await fetchWithAuth(`/api/omni/tasks/${id}`, { method: "DELETE" })
    toast.success("Tarea eliminada")
  }

  if (tasks === null) {
    return <div className="text-sm text-muted-foreground">Cargando…</div>
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              dot={col.dot}
              tasks={tasks.filter((t) => t.column_id === col.id).sort((a, b) => a.order - b.order)}
              onTaskClick={setModalTask}
              onQuickAdd={handleQuickAdd}
            />
          ))}
        </div>
        <DragOverlay>{activeTask && <TaskCard task={activeTask} isOverlay />}</DragOverlay>
      </DndContext>

      {modalTask && (
        <TaskModal task={modalTask} onClose={() => setModalTask(null)} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}
    </>
  )
}
