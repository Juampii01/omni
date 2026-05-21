import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { encrypt, decrypt } from "@/lib/crypto"

const CALENDLY_BASE = "https://api.calendly.com"

function calendlyHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  }
}

/** Safely decrypt the stored key. Returns null if missing or corrupt. */
function safeDecrypt(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null
  try {
    return decrypt(encrypted)
  } catch {
    return null
  }
}

// ── GET /api/calendly — fetch scheduled events ────────────────────────────────

export async function GET(req: NextRequest) {
  try { await requireAuth() } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }) }

  const supabase = await createClient()
  const { data: settings } = await (supabase as any)
    .from("client_settings")
    .select("calendly_api_key_encrypted, calendly_user_uri")
    .single()

  const apiKey = safeDecrypt(settings?.calendly_api_key_encrypted)

  if (!apiKey) {
    return NextResponse.json({ error: "not_connected" }, { status: 400 })
  }

  let userUri = settings.calendly_user_uri as string | null

  // Resolve user URI if missing
  if (!userUri) {
    const meRes = await fetch(`${CALENDLY_BASE}/users/me`, { headers: calendlyHeaders(apiKey) })
    if (!meRes.ok) return NextResponse.json({ error: "invalid_key" }, { status: 401 })
    const me = await meRes.json()
    userUri = me.resource.uri
    await (supabase as any).from("client_settings").update({ calendly_user_uri: userUri })
  }

  // Date window: from start of 3 months ago to 6 months ahead
  const minStart = new Date()
  minStart.setMonth(minStart.getMonth() - 3)
  const maxStart = new Date()
  maxStart.setMonth(maxStart.getMonth() + 6)

  const url = new URL(`${CALENDLY_BASE}/scheduled_events`)
  url.searchParams.set("user", userUri)
  url.searchParams.set("min_start_time", minStart.toISOString())
  url.searchParams.set("max_start_time", maxStart.toISOString())
  url.searchParams.set("status", "active")
  url.searchParams.set("count", "100")
  url.searchParams.set("sort", "start_time:asc")

  const eventsRes = await fetch(url.toString(), { headers: calendlyHeaders(apiKey) })
  if (!eventsRes.ok) {
    const errText = await eventsRes.text()
    console.error("Calendly events error:", errText)
    return NextResponse.json({ error: "calendly_api_error" }, { status: eventsRes.status })
  }

  const eventsData = await eventsRes.json()
  const rawEvents: any[] = eventsData.collection ?? []

  // Fetch invitees in parallel (max 60 events, max 5 invitees each)
  const enriched = await Promise.all(
    rawEvents.slice(0, 60).map(async (event: any) => {
      const uuid = event.uri.split("/").pop()
      try {
        const invRes = await fetch(
          `${CALENDLY_BASE}/scheduled_events/${uuid}/invitees?count=5`,
          { headers: calendlyHeaders(apiKey) }
        )
        const invData = invRes.ok ? await invRes.json() : { collection: [] }
        return { ...event, invitees: invData.collection ?? [] }
      } catch {
        return { ...event, invitees: [] }
      }
    })
  )

  return NextResponse.json({ events: enriched })
}

// ── POST /api/calendly — connect (save API key) ───────────────────────────────

export async function POST(req: NextRequest) {
  try { await requireAuth() } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }) }

  const { api_key } = await req.json()
  if (!api_key?.trim()) {
    return NextResponse.json({ error: "API key requerida" }, { status: 400 })
  }

  const plainKey = api_key.trim()

  // Validate key by calling /users/me
  const meRes = await fetch(`${CALENDLY_BASE}/users/me`, {
    headers: calendlyHeaders(plainKey),
  })

  if (!meRes.ok) {
    return NextResponse.json({ error: "API key inválida. Verificá que sea correcta." }, { status: 400 })
  }

  const me   = await meRes.json()
  const user = me.resource

  // Encrypt before storing
  let encryptedKey: string
  try {
    encryptedKey = encrypt(plainKey)
  } catch (err) {
    console.error("Encryption error:", err)
    return NextResponse.json(
      { error: "Error de configuración del servidor. Contactá al soporte." },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  await (supabase as any).from("client_settings").update({
    calendly_api_key_encrypted: encryptedKey,
    calendly_user_uri:          user.uri,
    calendly_name:              user.name,
    calendly_email:             user.email,
  })

  return NextResponse.json({
    success: true,
    name:  user.name,
    email: user.email,
    slug:  user.slug,
  })
}

// ── DELETE /api/calendly — disconnect ─────────────────────────────────────────

export async function DELETE() {
  try { await requireAuth() } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }) }

  const supabase = await createClient()
  await (supabase as any).from("client_settings").update({
    calendly_api_key_encrypted: null,
    calendly_user_uri:          null,
    calendly_name:              null,
    calendly_email:             null,
  })

  return NextResponse.json({ success: true })
}
