// Validación compartida del state de OAuth (Instagram y Slack) — single-use,
// TTL 10 min, ligado a un client_id. Se borra siempre al leerlo, incluso si
// resulta inválido, para que un state ya usado nunca pueda reintentarse.

import { createServiceClient } from "@/lib/supabase-service"

export async function consumeOAuthState(state: string, provider: "instagram" | "slack"): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase.from("oauth_states").select("client_id, provider, expires_at").eq("state", state).maybeSingle()
  if (!data) return null

  await supabase.from("oauth_states").delete().eq("state", state)

  if (data.provider !== provider) return null
  if (new Date(data.expires_at).getTime() < Date.now()) return null
  return data.client_id as string
}
