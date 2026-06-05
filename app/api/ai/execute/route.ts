import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { executeProposal, proposalSchema } from "@/lib/ai/agent"

// POST /api/ai/execute — ejecuta UNA propuesta ya confirmada por el usuario.
// Se re-valida la forma con Zod y se ejecuta con el cliente RLS-scopeado:
// el usuario nunca puede hacer más de lo que sus permisos (RLS) le permiten.
export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try { user = await requireAuth() } catch { return new Response("No autorizado", { status: 401 }) }

  const body = await req.json().catch(() => ({}))
  const parsed = proposalSchema.safeParse(body?.proposal)
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Propuesta inválida." }, { status: 400 })
  }
  const proposal = parsed.data

  const supabase = await createClient()
  const result = await executeProposal(supabase as any, user.id, proposal)

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error ?? "No se pudo ejecutar la acción." }, { status: 400 })
  }

  // Nota de auditoría en la conversación (best-effort, no bloquea)
  const conversationId: string | undefined = body?.conversationId
  if (conversationId) {
    try {
      const svc = (await createServiceClient()) as any
      await svc.from("ai_messages").insert({
        conversation_id: conversationId,
        role: "system",
        content: `✅ Acción ejecutada por ${user.full_name ?? user.email}: ${proposal.summary}`,
      })
    } catch { /* noop */ }
  }

  return Response.json({ ok: true, row: result.row })
}
