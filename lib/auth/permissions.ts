import type { UserRole } from "@/lib/constants"

type Permission =
  | "lead.create" | "lead.update" | "lead.delete"
  | "task.create" | "task.update" | "task.delete"
  | "kpi.create" | "kpi.update" | "kpi.delete"
  | "member.invite" | "member.remove" | "member.update_role"
  | "department.create" | "department.update" | "department.delete"
  | "settings.update" | "settings.branding"
  | "integration.manage"
  | "audit.read"
  | "content.create" | "content.update" | "content.delete"

const PERMISSIONS: Record<Permission, UserRole[]> = {
  "lead.create":          ["owner", "admin", "manager", "team"],
  "lead.update":          ["owner", "admin", "manager", "team"],
  "lead.delete":          ["owner", "admin"],
  "task.create":          ["owner", "admin", "manager", "team"],
  "task.update":          ["owner", "admin", "manager", "team"],
  "task.delete":          ["owner", "admin", "manager"],
  "kpi.create":           ["owner", "admin", "manager"],
  "kpi.update":           ["owner", "admin", "manager"],
  "kpi.delete":           ["owner", "admin"],
  "member.invite":        ["owner", "admin"],
  "member.remove":        ["owner", "admin"],
  "member.update_role":   ["owner"],
  "department.create":    ["owner", "admin"],
  "department.update":    ["owner", "admin"],
  "department.delete":    ["owner"],
  "settings.update":      ["owner", "admin"],
  "settings.branding":    ["owner", "admin"],
  "integration.manage":   ["owner", "admin"],
  "audit.read":           ["owner", "admin"],
  "content.create":       ["owner", "admin", "manager", "team"],
  "content.update":       ["owner", "admin", "manager", "team"],
  "content.delete":       ["owner", "admin", "manager"],
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  team: 1,
}

export function can(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false
}

export function hasMinRole(role: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}

export function isAdmin(role: UserRole): boolean {
  return hasMinRole(role, "admin")
}
