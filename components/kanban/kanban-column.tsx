"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { TaskCard } from "./task-card"
import type { Task } from "./constants"

export function KanbanColumn({
  id,
  label,
  dot,
  tasks,
  onTaskClick,
  onQuickAdd,
}: {
  id: string
  label: string
  dot: string
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onQuickAdd: (columnId: string, title: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")

  function submit() {
    if (title.trim()) onQuickAdd(id, title.trim())
    setTitle("")
    setAdding(false)
  }

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <p className="text-sm font-medium">{label}</p>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-2xl border p-2 transition-colors ${
          isOver ? "border-primary/40 bg-primary/5" : "border-border/40 bg-muted/30"
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>

        {adding ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit()
              if (e.key === "Escape") setAdding(false)
            }}
            onBlur={submit}
            placeholder="Título de la tarea…"
            className="w-full rounded-lg border border-border/60 bg-background px-2.5 py-2 text-sm outline-none"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent/50"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar tarea
          </button>
        )}
      </div>
    </div>
  )
}
