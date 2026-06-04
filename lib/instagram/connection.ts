/**
 * Helper compartido para resolver la conexión de Instagram (single-tenant).
 *
 * Omni guarda UNA cuenta de Instagram primaria por deploy. El token vive
 * cifrado en `integrations.access_token_encrypted` y la cuenta en
 * `instagram_accounts` (con `integration_id` apuntando a integrations).
 *
 * Devuelve la cuenta + el token desencriptado, o un estado de error claro
 * que las rutas mapean a códigos HTTP (NOT_CONNECTED / TOKEN_EXPIRED / etc.).
 */

import { decrypt } from "@/lib/crypto"

export interface IGConnection {
  accountDbId: string        // instagram_accounts.id (uuid interno)
  igUserId: string           // ig_user_id (id de Instagram)
  username: string | null
  profilePictureUrl: string | null
  followersCount: number
  mediaCount: number
  integrationId: string | null
  token: string              // access token desencriptado
  expiresAt: string | null   // ISO
  tokenExpired: boolean
}

export type ConnectionError =
  | { kind: "NOT_CONNECTED" }
  | { kind: "TOKEN_EXPIRED" }
  | { kind: "TOKEN_DECRYPTION_FAILED" }

export type ConnectionResult =
  | { ok: true; conn: IGConnection }
  | { ok: false; error: ConnectionError }

/**
 * Resuelve la cuenta primaria + token. `supabase` puede ser el cliente
 * RLS (createClient) o el service client (createServiceClient).
 */
export async function resolvePrimaryConnection(
  supabase: unknown,
): Promise<ConnectionResult> {
  const sb = supabase as {
    from: (t: string) => any
  }

  const { data: igRow, error } = await sb
    .from("instagram_accounts")
    .select(
      "id, ig_user_id, username, profile_picture_url, followers_count, media_count, integration_id, integrations(access_token_encrypted, expires_at)",
    )
    .eq("is_primary", true)
    .maybeSingle()

  if (error || !igRow || !igRow.integrations) {
    return { ok: false, error: { kind: "NOT_CONNECTED" } }
  }

  const expiresAtRaw: string | null = igRow.integrations.expires_at ?? null
  const tokenExpired = expiresAtRaw ? new Date(expiresAtRaw).getTime() <= Date.now() : false

  if (tokenExpired) {
    return { ok: false, error: { kind: "TOKEN_EXPIRED" } }
  }

  let token: string
  try {
    token = decrypt(igRow.integrations.access_token_encrypted)
  } catch {
    return { ok: false, error: { kind: "TOKEN_DECRYPTION_FAILED" } }
  }

  return {
    ok: true,
    conn: {
      accountDbId: igRow.id,
      igUserId: igRow.ig_user_id,
      username: igRow.username ?? null,
      profilePictureUrl: igRow.profile_picture_url ?? null,
      followersCount: igRow.followers_count ?? 0,
      mediaCount: igRow.media_count ?? 0,
      integrationId: igRow.integration_id ?? null,
      token,
      expiresAt: expiresAtRaw,
      tokenExpired: false,
    },
  }
}
