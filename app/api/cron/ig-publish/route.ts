/**
 * POST /api/cron/ig-publish
 *
 * Processes the instagram_publish_queue:
 * - Picks all rows with status='pending' and scheduled_for <= now
 * - Creates media container via Meta Graph API
 * - Publishes it (single image/video) or builds carousel
 * - Updates row status to 'published' or 'failed'
 *
 * Called by Vercel cron every 5 minutes (vercel.json) — but since Hobby
 * only supports daily crons, this must be triggered manually or via
 * an external scheduler (e.g., Vercel Cron on Pro, GitHub Actions, etc.)
 *
 * For Hobby plan: trigger manually via POST /api/cron/ig-publish
 * with Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient }               from "@supabase/supabase-js"
import { decrypt }                    from "@/lib/crypto"
import {
  createImageContainer, createReelContainer,
  createCarouselContainer, publishContainer,
} from "@/lib/instagram/client"

const MAX_ATTEMPTS = 3

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  ) as any

  const now = new Date().toISOString()

  // 1. Fetch due pending jobs
  const { data: jobs, error: fetchErr } = await sb
    .from("instagram_publish_queue")
    .select("*, instagram_accounts(id, ig_user_id, access_token_enc)")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .lt("attempt_count", MAX_ATTEMPTS)
    .order("scheduled_for", { ascending: true })
    .limit(10)

  if (fetchErr) {
    console.error("ig-publish: fetch error", fetchErr)
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  let published = 0
  let failed    = 0

  for (const job of jobs) {
    const account = job.instagram_accounts
    if (!account) {
      await sb.from("instagram_publish_queue")
        .update({ status: "failed", last_error: "No Instagram account found", attempt_count: job.attempt_count + 1 })
        .eq("id", job.id)
      failed++
      continue
    }

    // Mark as processing
    await sb.from("instagram_publish_queue")
      .update({ status: "processing", attempt_count: job.attempt_count + 1 })
      .eq("id", job.id)

    try {
      // Decrypt token
      const token = decrypt(account.access_token_enc)
      const igUserId = account.ig_user_id

      let igMediaId: string

      if (job.media_type === "IMAGE") {
        const containerId = await createImageContainer(igUserId, token, job.media_urls[0], job.caption ?? undefined)
        igMediaId = await publishContainer(igUserId, token, containerId)

      } else if (job.media_type === "REEL" || job.media_type === "VIDEO") {
        const containerId = await createReelContainer(
          igUserId, token, job.media_urls[0], job.caption ?? undefined, job.cover_url ?? undefined,
        )
        igMediaId = await publishContainer(igUserId, token, containerId)

      } else if (job.media_type === "CAROUSEL") {
        // Create individual item containers
        const itemIds: string[] = []
        for (const url of job.media_urls) {
          const itemId = await createImageContainer(igUserId, token, url, undefined, true)
          itemIds.push(itemId)
        }
        const carouselId = await createCarouselContainer(igUserId, token, itemIds, job.caption ?? undefined)
        igMediaId = await publishContainer(igUserId, token, carouselId)

      } else {
        throw new Error(`Unsupported media_type: ${job.media_type}`)
      }

      // Mark published
      await sb.from("instagram_publish_queue").update({
        status:       "published",
        ig_media_id:  igMediaId,
        published_at: new Date().toISOString(),
      }).eq("id", job.id)

      published++
      console.log(`ig-publish: published job ${job.id} → ${igMediaId}`)

    } catch (err: any) {
      const errMsg = err?.message ?? String(err)
      console.error(`ig-publish: job ${job.id} failed:`, errMsg)

      const newAttempts = job.attempt_count + 1
      await sb.from("instagram_publish_queue").update({
        status:      newAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
        last_error:  errMsg,
      }).eq("id", job.id)

      failed++
    }
  }

  return NextResponse.json({ ok: true, processed: jobs.length, published, failed })
}
