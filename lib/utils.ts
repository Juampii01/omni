import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parsea una columna `date` de Postgres ("YYYY-MM-DD") como fecha local en
 * vez de UTC medianoche — `new Date("2026-07-09")` corre un día para atrás
 * en cualquier timezone detrás de UTC (ej. Argentina) al formatear. */
export function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}
