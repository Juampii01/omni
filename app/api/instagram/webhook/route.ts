import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { createClient } from "@/lib/supabase/server"

// ── GET — Meta webhook verification ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse("Forbidden", { status: 403 })
}

// ── POST — Incoming webhook events ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Validate HMAC-SHA256 signature
  const signature = req.headers.get("x-hub-signature-256")
  if (!signature) {
    return new NextResponse("Missing signature", { status: 401 })
  }

  const secret = process.env.META_APP_SECRET
  if (!secret) {
    console.error("META_APP_SECRET not configured")
    return new NextResponse("Server misconfigured", { status: 500 })
  }

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`

  try {
    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return new NextResponse("Invalid signature", { status: 401 })
    }
  } catch {
    return new NextResponse("Invalid signature", { status: 401 })
  }

  let payload: { object: string; entry: unknown[] }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 })
  }

  // Log raw event for replay / debugging
  const supabase = await createClient()
  await (supabase as any).from("instagram_webhooks_log").insert({
    object_type: payload.object,
    entry: payload.entry,
    processed: false,
  })

  // Acknowledge immediately; process async
  processWebhookAsync(payload).catch(console.error)

  return NextResponse.json({ ok: true })
}

async function processWebhookAsync(payload: { object: string; entry: unknown[] }) {
  if (payload.object !== "instagram") return

  const supabase = await createClient()

  for (const rawEntry of payload.entry) {
    const entry = rawEntry as {
      id?: string
      changes?: Array<{ field: string; value: unknown }>
    }

    for (const change of entry.changes ?? []) {
      if (change.field === "comments") {
        const v = change.value as {
          media_id?: string
          id?: string
          from?: { id: string; username: string }
          text?: string
          timestamp?: number
        }

        if (!v.media_id || !v.id) continue

        // Resolve media DB row
        const { data: mediaRow } = await (supabase as any)
          .from("instagram_media")
          .select("id")
          .eq("ig_media_id", v.media_id)
          .single()

        if (!mediaRow) continue

        await (supabase as any).from("instagram_comments").upsert(
          {
            media_id: mediaRow.id,
            ig_comment_id: v.id,
            ig_user_id: v.from?.id,
            username: v.from?.username,
            text: v.text ?? "",
            timestamp: v.timestamp
              ? new Date(v.timestamp * 1000).toISOString()
              : new Date().toISOString(),
          },
          { onConflict: "ig_comment_id" }
        )
      }
    }
  }
}
