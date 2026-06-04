/**
 * Rate limiter in-memory (single-tenant).
 *
 * Omni corre como un deploy por cliente, así que un limiter en memoria por
 * instancia es suficiente. Ventana deslizante simple por clave.
 *
 * Uso:
 *   const r = await checkRateLimit("instagram:sync", 5, "60 s")
 *   if (r && !r.success) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 })
 *
 * Nota: en serverless (Vercel) la memoria no se comparte entre instancias, así
 * que esto es un best-effort anti-abuso, no un límite duro distribuido.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Parsea "60 s" / "5 m" / "1 h" → milisegundos. */
function parseWindow(window: string): number {
  const m = window.trim().match(/^(\d+)\s*(s|m|h)$/i)
  if (!m) return 60_000
  const n = parseInt(m[1], 10)
  const unit = m[2].toLowerCase()
  if (unit === "s") return n * 1_000
  if (unit === "m") return n * 60_000
  return n * 3_600_000
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * Devuelve { success, remaining, resetAt }.
 * `success: false` cuando se superó el límite en la ventana.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  window: string,
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = parseWindow(window)
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt }
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  buckets.set(key, existing)
  return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt }
}

/** Limpieza opcional de buckets vencidos (llamar esporádicamente si crece). */
export function pruneRateLimits(): void {
  const now = Date.now()
  for (const [k, v] of buckets.entries()) {
    if (now >= v.resetAt) buckets.delete(k)
  }
}
