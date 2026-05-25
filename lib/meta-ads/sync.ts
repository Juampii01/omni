/**
 * Meta Ads sync logic.
 *
 * Fetches campaigns + insights for the active Meta Ads account and upserts
 * them into meta_ads_campaigns + meta_ads_insights.
 */

import { decrypt, encrypt } from "@/lib/crypto"
import { createServiceClient } from "@/lib/supabase/server"
import {
  getCampaigns,
  getCampaignInsights,
  refreshMetaAdsToken,
} from "./client"

export interface SyncResult {
  ok: boolean
  error?: string
  campaigns?: number
  insights?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDateStr(d: Date): string {
  return d.toISOString().split("T")[0]
}

function sumAction(
  actions: Array<{ action_type: string; value: string }> | undefined,
  types: string[],
): number {
  if (!actions) return 0
  return actions
    .filter(a => types.includes(a.action_type))
    .reduce((s, a) => s + parseFloat(a.value || "0"), 0)
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function syncMetaAdsAccount(): Promise<SyncResult> {
  try {
    const supabase = await createServiceClient()
    const sb = supabase as any

    // 1. Find active account
    const { data: accountRow, error: accErr } = await sb
      .from("meta_ads_accounts")
      .select("id, meta_account_id, access_token_enc, token_expires_at")
      .eq("is_active", true)
      .maybeSingle()

    if (accErr) return { ok: false, error: accErr.message }
    if (!accountRow) return { ok: false, error: "No hay cuenta Meta Ads conectada" }

    // 2. Decrypt token
    let accessToken = decrypt(accountRow.access_token_enc as string)

    // 3. Refresh token if expiry is within 10 days
    const tokenExpiresAt = accountRow.token_expires_at
      ? new Date(accountRow.token_expires_at as string)
      : null
    const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)

    if (tokenExpiresAt && tokenExpiresAt < tenDaysFromNow) {
      try {
        const newToken = await refreshMetaAdsToken(accessToken)
        const newEnc = encrypt(newToken)
        const newExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
        await sb
          .from("meta_ads_accounts")
          .update({ access_token_enc: newEnc, token_expires_at: newExpiry })
          .eq("id", accountRow.id)
        accessToken = newToken
      } catch (refreshErr) {
        // Non-fatal: log and continue with existing token
        console.warn("Meta Ads token refresh failed:", refreshErr)
      }
    }

    const accountId = accountRow.meta_account_id as string

    // 4. Fetch campaigns
    const campaigns = await getCampaigns(accountId, accessToken)

    // Upsert campaigns
    if (campaigns.length > 0) {
      const campaignRows = campaigns.map(c => ({
        meta_account_id: accountId,
        campaign_id: c.id,
        name: c.name,
        objective: c.objective,
        status: c.status,
        daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
        lifetime_budget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
        start_time: c.start_time ?? null,
        stop_time: c.stop_time ?? null,
      }))

      const { error: campErr } = await sb
        .from("meta_ads_campaigns")
        .upsert(campaignRows, { onConflict: "campaign_id" })

      if (campErr) console.warn("Campaign upsert error:", campErr.message)
    }

    // 5. Fetch insights for active campaigns (last 30 days)
    const until = new Date()
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const dateRange = { since: isoDateStr(since), until: isoDateStr(until) }

    const activeCampaigns = campaigns.filter(c =>
      c.status === "ACTIVE" || c.status === "PAUSED"
    )

    let totalInsights = 0

    for (const campaign of activeCampaigns) {
      const insights = await getCampaignInsights(campaign.id, accessToken, dateRange)

      if (insights.length === 0) continue

      const insightRows = insights.map(ins => {
        const spend = parseFloat(ins.spend || "0")
        const conversions = sumAction(ins.actions, ["lead", "purchase"])
        const revenueFromPurchase = sumAction(ins.action_values, ["purchase"])
        const roas = spend > 0 ? revenueFromPurchase / spend : 0
        const cpl = conversions > 0 ? spend / conversions : 0

        return {
          campaign_id: campaign.id,
          meta_account_id: accountId,
          date: ins.date_start,
          spend,
          impressions: parseInt(ins.impressions || "0", 10),
          clicks: parseInt(ins.clicks || "0", 10),
          ctr: parseFloat(ins.ctr || "0"),
          cpc: parseFloat(ins.cpc || "0"),
          cpm: parseFloat(ins.cpm || "0"),
          reach: parseInt(ins.reach || "0", 10),
          frequency: parseFloat(ins.frequency || "0"),
          conversions,
          roas,
          cpl,
        }
      })

      const { error: insErr } = await sb
        .from("meta_ads_insights")
        .upsert(insightRows, { onConflict: "campaign_id,date" })

      if (insErr) console.warn(`Insights upsert error for campaign ${campaign.id}:`, insErr.message)
      else totalInsights += insightRows.length
    }

    // 6. Update last_synced_at
    await sb
      .from("meta_ads_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", accountRow.id)

    return { ok: true, campaigns: campaigns.length, insights: totalInsights }
  } catch (err) {
    console.error("syncMetaAdsAccount error:", err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    }
  }
}
