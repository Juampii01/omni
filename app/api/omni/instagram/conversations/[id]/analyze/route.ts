import { NextRequest, NextResponse } from "next/server"
import { requireInternal, getJwt } from "@/lib/auth/api-guards"
import { runConversationAnalysis, ConversationAnalysisError } from "@/lib/omni/conversation-analysis"
import { checkRateLimit } from "@/lib/omni/rate-limit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!(await checkRateLimit(ctx.clientId, "conversation-analyze", { maxCalls: 5, windowSeconds: 60 }))) {
    return NextResponse.json({ error: "Demasiadas solicitudes, esperá un momento y volvé a intentar." }, { status: 429 })
  }

  const { id } = await params

  try {
    const result = await runConversationAnalysis(ctx.clientId, id)
    return NextResponse.json({ analysis: result })
  } catch (e) {
    const status = e instanceof ConversationAnalysisError ? e.status : 500
    const message = e instanceof Error ? e.message : "Error generando el análisis"
    return NextResponse.json({ error: message }, { status })
  }
}
