/**
 * Roles posibles en `profiles.role`: "owner" | "admin" | "team" | "client".
 * owner/admin/team son staff interno (is_internal_staff() en RLS); client es
 * el usuario del negocio que usa Omni, scopeado a su propio client_id.
 */

export type UserRole = "owner" | "admin" | "team" | "client" | string | null | undefined

export function isInternal(role: UserRole): boolean {
  const r = String(role ?? "").toLowerCase()
  return r === "owner" || r === "admin" || r === "team"
}
