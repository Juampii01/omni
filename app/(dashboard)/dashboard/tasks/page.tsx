"use client"

import { useSession } from "@/lib/auth/use-session"
import { KanbanBoard } from "@/components/kanban/kanban-board"

export default function TasksPage() {
  const { session } = useSession()

  if (!session?.clientId) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Tareas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tu tablero — arrastrá para cambiar de estado.</p>
      </div>
      <KanbanBoard clientId={session.clientId} />
    </div>
  )
}
