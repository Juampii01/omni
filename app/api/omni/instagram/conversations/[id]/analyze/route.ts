import { NextRequest, NextResponse } from "next/server"
import { requireInternal } from "@/lib/auth/api-guards"
import { runConversationAnalysis, ConversationAnalysisError } from "@/lib/omni/conversation-analysis"

function getJwt(req: NextRequest) {
  const header = req.headers.get("authorization")
  return header?.startsWith("Bearer ") ? header.slice(7) : null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireInternal(getJwt(req))
  if (!ctx || !ctx.clientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

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
