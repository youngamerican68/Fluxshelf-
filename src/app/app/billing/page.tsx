import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PLAN_LIMITS } from "@/lib/stripe";
import { isStripeEnabled } from "@/lib/flags";
import { ArrowLeft, Check, Clock } from "lucide-react";
import { BillingActions } from "@/components/billing-actions";
import type { SubscriptionPlan } from "@/types/database";

// Free tier uses lifetime window (all time)
const LIFETIME_PERIOD = {
  start: new Date("1970-01-01"),
  end: new Date("9999-12-31"),
};

function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

const PLANS: Array<{
  id: SubscriptionPlan;
  name: string;
  price: string;
  campaigns: string;
  features: string[];
}> = [
  {
    id: "free",
    name: "Free Trial",
    price: "$0",
    campaigns: "1 campaign total",
    features: ["12 AI-generated images", "7 social captions", "3 aspect ratios"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$29/mo",
    campaigns: "10 campaigns/month",
    features: [
      "Everything in Free",
      "2 regenerations per campaign",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$79/mo",
    campaigns: "40 campaigns/month",
    features: ["Everything in Starter", "Faster generation", "Email support"],
  },
  {
    id: "agency",
    name: "Agency",
    price: "$199/mo",
    campaigns: "150 campaigns/month",
    features: ["Everything in Pro", "White-label exports", "Priority support"],
  },
];

export default async function BillingPage() {
  const supabase = await createClient();
  const stripeEnabled = isStripeEnabled();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get subscription
  interface Subscription {
    plan: SubscriptionPlan;
    stripe_customer_id: string | null;
    current_period_end: string | null;
  }
  const { data: subscription } = await (supabase
    .from("subscriptions") as any)
    .select("*")
    .eq("owner_id", user.id)
    .single() as { data: Subscription | null };

  const currentPlan: SubscriptionPlan = subscription?.plan || "free";
  const limits = PLAN_LIMITS[currentPlan];

  // Get usage - use lifetime period for free tier, monthly for paid
  const isLifetimePlan = limits.isLifetime;
  const { start, end } = isLifetimePlan ? LIFETIME_PERIOD : getCurrentPeriod();
  const { data: usage } = await (supabase
    .from("usage_ledger") as any)
    .select("campaigns_used")
    .eq("owner_id", user.id)
    .eq("period_start", formatDate(start))
    .eq("period_end", formatDate(end))
    .single() as { data: { campaigns_used: number } | null };

  const campaignsUsed = usage?.campaigns_used || 0;
  const usagePercentage = Math.min(
    (campaignsUsed / limits.campaignsPerMonth) * 100,
    100
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Link
          href="/app"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and usage
        </p>
      </div>

      {/* Billing Coming Soon Banner */}
      {!stripeEnabled && (
        <Card className="border-dashed bg-muted/50">
          <CardContent className="py-6 flex items-center gap-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Billing coming soon</h3>
              <p className="text-sm text-muted-foreground">
                Paid plans will be available soon. For now, enjoy your free trial.
                Contact us if you need additional capacity.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                {subscription?.current_period_end && !isLifetimePlan
                  ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : isLifetimePlan
                    ? "Free trial (lifetime limit)"
                    : "Free trial"}
              </CardDescription>
            </div>
            <Badge variant={currentPlan === "free" ? "secondary" : "default"}>
              {limits.displayName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">
                {isLifetimePlan ? "Lifetime campaigns" : "Monthly campaigns"}
              </span>
              <span className="text-sm text-muted-foreground">
                {campaignsUsed} / {limits.campaignsPerMonth}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
          </div>

          <BillingActions
            currentPlan={currentPlan}
            stripeCustomerId={subscription?.stripe_customer_id || null}
            stripeEnabled={stripeEnabled}
          />
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={
                plan.id === currentPlan ? "border-primary ring-1 ring-primary" : ""
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {plan.id === currentPlan && (
                    <Badge variant="secondary">Current</Badge>
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{plan.price}</span>
                </div>
                <CardDescription>{plan.campaigns}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">What counts as a campaign?</h4>
            <p className="text-sm text-muted-foreground">
              A campaign is one generation of 18 images (12 lifestyle + 6 marketplace-ready) + 7 captions for a
              single product.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Can I regenerate a campaign?</h4>
            <p className="text-sm text-muted-foreground">
              Paid plans include 2 regenerations per campaign. Each regeneration
              creates 18 new images.
            </p>
          </div>
          <div>
            <h4 className="font-medium">What happens if I cancel?</h4>
            <p className="text-sm text-muted-foreground">
              Your subscription will remain active until the end of the billing
              period. All your data and campaigns remain accessible.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
