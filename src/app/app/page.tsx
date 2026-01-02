import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Palette, ImageIcon, ArrowRight } from "lucide-react";
import { PLAN_LIMITS } from "@/lib/stripe";
import type { SubscriptionPlan, CampaignStatus } from "@/types/database";

function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getStatusVariant(status: CampaignStatus) {
  switch (status) {
    case "ready":
      return "success";
    case "generating":
    case "queued":
      return "warning";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's subscription
  interface Subscription {
    plan: SubscriptionPlan;
  }
  const { data: subscription } = await (supabase
    .from("subscriptions") as any)
    .select("*")
    .eq("owner_id", user.id)
    .single() as { data: Subscription | null };

  const plan: SubscriptionPlan = subscription?.plan || "free";
  const limits = PLAN_LIMITS[plan];

  // Get current period usage
  const { start, end } = getCurrentPeriod();
  const { data: usage } = await (supabase
    .from("usage_ledger") as any)
    .select("campaigns_used")
    .eq("owner_id", user.id)
    .eq("period_start", formatDate(start))
    .eq("period_end", formatDate(end))
    .single() as { data: { campaigns_used: number } | null };

  const campaignsUsed = usage?.campaigns_used || 0;
  const usagePercentage = (campaignsUsed / limits.campaignsPerMonth) * 100;

  // Get user's brands
  interface Brand {
    id: string;
    name: string | null;
    created_at: string;
  }
  const { data: brands } = await (supabase
    .from("brands") as any)
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5) as { data: Brand[] | null };

  // Get recent campaigns
  interface Campaign {
    id: string;
    product_title: string | null;
    status: CampaignStatus;
    brands: { name: string | null } | null;
  }
  const { data: campaigns } = await (supabase
    .from("campaigns") as any)
    .select("*, brands(name)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5) as { data: Campaign[] | null };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your brands and campaigns
          </p>
        </div>
        <Link href="/app/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Monthly Usage</CardTitle>
              <CardDescription>
                {limits.displayName} plan - {campaignsUsed} of{" "}
                {limits.campaignsPerMonth} campaigns used
              </CardDescription>
            </div>
            <Badge variant={plan === "free" ? "secondary" : "default"}>
              {limits.displayName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={usagePercentage} className="h-2" />
          {plan === "free" && campaignsUsed >= limits.campaignsPerMonth && (
            <p className="text-sm text-muted-foreground mt-2">
              You&apos;ve used your free campaign.{" "}
              <Link
                href="/app/billing"
                className="text-primary hover:underline"
              >
                Upgrade to continue
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Brands */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Your Brands
              </CardTitle>
              <Link href="/app/brands/new">
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {brands && brands.length > 0 ? (
              <div className="space-y-3">
                {brands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/app/brands/${brand.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">
                        {brand.name || "My Brand"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created{" "}
                        {new Date(brand.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No brands yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  A default brand will be created when you make your first campaign
                </p>
                <Link href="/app/brands/new">
                  <Button variant="outline" size="sm">Set Up Brand (Optional)</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Recent Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns && campaigns.length > 0 ? (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/app/campaigns/${campaign.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {campaign.product_title || "Untitled Campaign"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.brands?.name || "My Brand"}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No campaigns yet</p>
                <Link href="/app/campaigns/new">
                  <Button>Create Your First Campaign</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
