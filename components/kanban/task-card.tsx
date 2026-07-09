"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Lock } from "lucide-react"
import { PRIORITIES, type Task } from "./constants"
import { initials, avatarColor } from "./avatar"
import { parseLocalDate } from "@/lib/utils"

export function TaskCard({
  task,
  onClick,
  isOverlay,
}: {
  task: Task
  onClick?: () => void
  isOverlay?: boolean
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: task.id })
  const priority = PRIORITIES.find((p) => p.id === task.priority) ?? PRIORITIES[2]

  const doneCount = task.subtasks.filter((s) => s.done).length
  const progress = task.subtasks.length > 0 ? Math.round((doneCount / task.subtasks.length) * 100) : null

  const today = new Date().toISOString().slice(0, 10)
  const dueClass = task.due_date && task.due_date < today ? "text-destructive" : task.due_date === today ? "text-chart-3" : "text-muted-foreground"

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.4 : 1,
      }}
      className={`cursor-grab overflow-hidden rounded-xl border border-border/60 bg-card active:cursor-grabbing ${isOverlay ? "rotate-1 scale-[1.03] shadow-xl" : "hover:shadow-sm"}`}
    >
      <div className="flex">
        <div className="w-1 shrink-0" style={{ backgroundColor: priority.color }} />
        <div className="flex-1 space-y-2 p-3">
          {task.label_text && (
            <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">{task.label_text}</span>
          )}
          <p className="text-sm font-medium leading-snug">
            {task.blocked && <Lock className="mr-1 inline h-3 w-3 text-destructive" />}
            {task.title}
          </p>
          {progress !== null && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${progress === 100 ? "bg-primary" : "bg-chart-3"}`} style={{ width: `${progress}%` }} />
            </div>
          )}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              {task.due_date && <span className={dueClass}>{parseLocalDate(task.due_date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}</span>}
            </div>
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 3).map((a) => (
                <div
                  key={a}
                  title={a}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-card text-[9px] font-medium text-white"
                  style={{ backgroundColor: avatarColor(a) }}
                >
                  {initials(a)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
