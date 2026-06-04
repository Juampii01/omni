/**
 * POST /api/instagram/sync
 *
 * Dispara manualmente la sincronización de la cuenta de Instagram primaria
 * (perfil + media + insights). Reutiliza syncInstagramAccount() que ya usa el cron.
 *
 * Respuestas:
 *   200 { ok: true }
 *   401 { error: 'UNAUTHORIZED' }
 *   404 { error: 'NOT_CONNECTED' }
 *   429 { error: 'RATE_LIMITED' }
 *   500 { error: 'SYNC_FAILED', detail }
 */
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { syncInstagramAccount } from "@/lib/instagram/sync"
import { checkRateLimit } from "@/lib/utils/ratelimit"

export async function POST(): Promise<NextResponse> {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  // Rate limit: 5 por minuto (el sync es pesado)
  const rl = await checkRateLimit("instagram:sync", 5, "60 s")
  if (!rl.success) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 })
  }

  const result = await syncInstagramAccount()

  if (!result.ok) {
    const notConnected = result.error?.toLowerCase().includes("no ig account")
    return NextResponse.json(
      { error: notConnected ? "NOT_CONNECTED" : "SYNC_FAILED", detail: result.error },
      { status: notConnected ? 404 : 500 },
    )
  }

  return NextResponse.json({ ok: true, synced: { snapshot: true } })
}
