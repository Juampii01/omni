// ── Brand ────────────────────────────────────────────────────────────────────
export const BRAND_COLOR_HEX = "#236461"
export const BRAND_COLOR_HSL = "163 47% 28%"

// ── Roles ────────────────────────────────────────────────────────────────────
export const ROLES = ["owner", "admin", "manager", "team"] as const
export type UserRole = (typeof ROLES)[number]

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  team: "Team",
}

// ── Lead stages ──────────────────────────────────────────────────────────────
export const LEAD_STAGES = [
  "new",
  "contacted",
  "qualified",
  "call_scheduled",
  "call_done",
  "proposal_sent",
  "won",
  "lost",
] as const
export type LeadStage = (typeof LEAD_STAGES)[number]

// Etapas activas del pipeline (excluye won/lost) — útil para filtros.
export const ACTIVE_LEAD_STAGES: LeadStage[] = [
  "new", "contacted", "qualified", "call_scheduled", "call_done", "proposal_sent",
]

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  call_scheduled: "Llamada agendada",
  call_done: "Llamada hecha",
  proposal_sent: "Propuesta enviada",
  won: "Cerrado",
  lost: "Perdido",
}

export const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  new: "bg-secondary text-secondary-foreground",
  contacted: "bg-sky-50 text-sky-700",
  qualified: "bg-blue-50 text-blue-700",
  call_scheduled: "bg-amber-50 text-amber-700",
  call_done: "bg-purple-50 text-purple-700",
  proposal_sent: "bg-orange-50 text-orange-700",
  won: "bg-green-50 text-green-700",
  lost: "bg-red-50 text-red-700",
}

// ── Task statuses ────────────────────────────────────────────────────────────
export const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
  "cancelled",
] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "Por hacer",
  in_progress: "En progreso",
  review: "En revisión",
  done: "Completado",
  cancelled: "Cancelado",
}

// ── Task priorities ──────────────────────────────────────────────────────────
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "text-muted-foreground",
  medium: "text-amber-600",
  high: "text-orange-600",
  urgent: "text-destructive",
}

// ── Navigation ───────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  {
    section: "Principal",
    items: [
      { label: "Overview", href: "/", icon: "layout-dashboard" },
      { label: "KPIs", href: "/kpis", icon: "bar-chart-2" },
    ],
  },
  {
    section: "Ventas",
    items: [
      { label: "Leads", href: "/crm", icon: "users" },
      { label: "Pipeline", href: "/crm/pipeline", icon: "git-branch" },
    ],
  },
  {
    section: "Operaciones",
    items: [
      { label: "Tareas", href: "/tasks", icon: "check-square" },
      { label: "Equipo", href: "/team", icon: "user-cog" },
    ],
  },
  {
    section: "Contenido",
    items: [
      { label: "Contenido", href: "/content", icon: "file-text" },
      { label: "Competidores", href: "/competitors", icon: "binoculars" },
    ],
  },
  {
    section: "Inteligencia",
    items: [
      { label: "IA Asistente", href: "/ai", icon: "sparkles" },
      { label: "Discovery", href: "/discovery", icon: "clipboard-list" },
    ],
  },
  {
    section: "Comunicación",
    items: [{ label: "Canales", href: "/comms", icon: "message-square" }],
  },
] as const

// ── Misc ─────────────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 25
export const MAX_FILE_SIZE_MB = 5
export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
