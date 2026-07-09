export const COLUMNS = [
  { id: "por-hacer", label: "Por hacer", dot: "bg-muted-foreground" },
  { id: "en-proceso", label: "En proceso", dot: "bg-chart-3" },
  { id: "en-revision", label: "En revisión", dot: "bg-chart-2" },
  { id: "listo", label: "Listo", dot: "bg-primary" },
] as const

export const PRIORITIES = [
  { id: "urgente", label: "Urgente", color: "#ef4444" },
  { id: "importante", label: "Importante", color: "#f59e0b" },
  { id: "con-tiempo", label: "Con tiempo", color: "#22c55e" },
] as const

export type Task = {
  id: string
  title: string
  description: string
  due_date: string | null
  label_text: string
  label_color: string
  column_id: string
  priority: "urgente" | "importante" | "con-tiempo"
  subtasks: Array<{ text: string; done: boolean }>
  blocked: boolean
  assignees: string[]
  order: number
}
