// Predicado de aislamiento compartido — cada call site mantiene su propia
// clase de error y mensaje, esto solo centraliza el chequeo en sí.
export function isOwnClient(rows: Array<{ client_id: string }>, clientId: string): boolean {
  return rows.every((r) => r.client_id === clientId)
}

export function findForeignRow<T extends { client_id: string }>(rows: T[], clientId: string): T | undefined {
  return rows.find((r) => r.client_id !== clientId)
}
