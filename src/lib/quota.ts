import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/stripe";
import type { SubscriptionPlan } from "@/types/database";

interface QuotaStatus {
  allowed: boolean;
  reason?: string;
  plan: SubscriptionPlan;
  campaignsUsed: number;
  campaignsLimit: number;
  regenerationsUsed: number;
  regenerationsLimit: number;
}

function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function checkCampaignQuota(userId: string): Promise<QuotaStatus> {
  const supabase = await createClient();
  const { start, end } = getCurrentPeriod();

  // Get user's subscription
  interface Subscription {
    plan: SubscriptionPlan;
    status: string;
  }
  const { data: subscription } = await (supabase
    .from("subscriptions") as any)
    .select("plan, status")
    .eq("owner_id", userId)
    .single() as { data: Subscription | null };

  const plan: SubscriptionPlan =
    subscription?.status === "active" ? subscription.plan : "free";
  const limits = PLAN_LIMITS[plan];

  // Get or create usage ledger for current period
  interface Usage {
    campaigns_used: number;
    regenerations_used: number;
  }
  const { data: usage } = await (supabase
    .from("usage_ledger") as any)
    .select("campaigns_used, regenerations_used")
    .eq("owner_id", userId)
    .eq("period_start", formatDate(start))
    .eq("period_end", formatDate(end))
    .single() as { data: Usage | null };

  const campaignsUsed = usage?.campaigns_used || 0;
  const regenerationsUsed = usage?.regenerations_used || 0;

  if (campaignsUsed >= limits.campaignsPerMonth) {
    return {
      allowed: false,
      reason: `You've used all ${limits.campaignsPerMonth} campaigns for this month. Upgrade your plan to generate more.`,
      plan,
      campaignsUsed,
      campaignsLimit: limits.campaignsPerMonth,
      regenerationsUsed,
      regenerationsLimit: limits.regenerationsPerCampaign,
    };
  }

  return {
    allowed: true,
    plan,
    campaignsUsed,
    campaignsLimit: limits.campaignsPerMonth,
    regenerationsUsed,
    regenerationsLimit: limits.regenerationsPerCampaign,
  };
}

export async function checkRegenerationQuota(
  userId: string,
  campaignId: string
): Promise<QuotaStatus> {
  const supabase = await createClient();
  const { start, end } = getCurrentPeriod();

  // Get user's subscription
  interface Subscription {
    plan: SubscriptionPlan;
    status: string;
  }
  const { data: subscription } = await (supabase
    .from("subscriptions") as any)
    .select("plan, status")
    .eq("owner_id", userId)
    .single() as { data: Subscription | null };

  const plan: SubscriptionPlan =
    subscription?.status === "active" ? subscription.plan : "free";
  const limits = PLAN_LIMITS[plan];

  // Get campaign regeneration count
  interface Campaign {
    regeneration_count: number;
  }
  const { data: campaign } = await (supabase
    .from("campaigns") as any)
    .select("regeneration_count")
    .eq("id", campaignId)
    .eq("owner_id", userId)
    .single() as { data: Campaign | null };

  const regenerationsUsed = campaign?.regeneration_count || 0;

  // Get usage ledger
  interface UsageLedger {
    campaigns_used: number;
  }
  const { data: usage } = await (supabase
    .from("usage_ledger") as any)
    .select("campaigns_used")
    .eq("owner_id", userId)
    .eq("period_start", formatDate(start))
    .eq("period_end", formatDate(end))
    .single() as { data: UsageLedger | null };

  if (regenerationsUsed >= limits.regenerationsPerCampaign) {
    return {
      allowed: false,
      reason: `This campaign has reached its maximum of ${limits.regenerationsPerCampaign} regenerations.`,
      plan,
      campaignsUsed: usage?.campaigns_used || 0,
      campaignsLimit: limits.campaignsPerMonth,
      regenerationsUsed,
      regenerationsLimit: limits.regenerationsPerCampaign,
    };
  }

  return {
    allowed: true,
    plan,
    campaignsUsed: usage?.campaigns_used || 0,
    campaignsLimit: limits.campaignsPerMonth,
    regenerationsUsed,
    regenerationsLimit: limits.regenerationsPerCampaign,
  };
}

export async function incrementCampaignUsage(userId: string): Promise<void> {
  const supabase = await createClient();
  const { start, end } = getCurrentPeriod();

  // Upsert usage ledger
  interface ExistingUsage {
    id: string;
    campaigns_used: number;
  }
  const { data: existing } = await (supabase
    .from("usage_ledger") as any)
    .select("id, campaigns_used")
    .eq("owner_id", userId)
    .eq("period_start", formatDate(start))
    .eq("period_end", formatDate(end))
    .single() as { data: ExistingUsage | null };

  if (existing) {
    await (supabase.from("usage_ledger") as any)
      .update({ campaigns_used: existing.campaigns_used + 1 })
      .eq("id", existing.id);
  } else {
    await (supabase.from("usage_ledger") as any).insert({
      owner_id: userId,
      period_start: formatDate(start),
      period_end: formatDate(end),
      campaigns_used: 1,
      regenerations_used: 0,
    });
  }
}

export async function incrementRegenerationCount(
  campaignId: string
): Promise<void> {
  const supabase = await createClient();

  interface CampaignData {
    regeneration_count: number;
  }
  const { data: campaign } = await (supabase
    .from("campaigns") as any)
    .select("regeneration_count")
    .eq("id", campaignId)
    .single() as { data: CampaignData | null };

  await (supabase.from("campaigns") as any)
    .update({ regeneration_count: (campaign?.regeneration_count || 0) + 1 })
    .eq("id", campaignId);
}

export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  return checkCampaignQuota(userId);
}
