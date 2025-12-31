import Stripe from "stripe";
import type { SubscriptionPlan } from "@/types/database";

// Lazy initialization of Stripe client
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

// For backwards compatibility
export const stripe = {
  get checkout() { return getStripe().checkout; },
  get subscriptions() { return getStripe().subscriptions; },
  get billingPortal() { return getStripe().billingPortal; },
  get webhooks() { return getStripe().webhooks; },
};

// Plan limits configuration
export const PLAN_LIMITS: Record<
  SubscriptionPlan,
  {
    campaignsPerMonth: number;
    regenerationsPerCampaign: number;
    displayName: string;
    price: number; // Monthly price in cents
  }
> = {
  free: {
    campaignsPerMonth: 1,
    regenerationsPerCampaign: 0,
    displayName: "Free Trial",
    price: 0,
  },
  starter: {
    campaignsPerMonth: 10,
    regenerationsPerCampaign: 2,
    displayName: "Starter",
    price: 2900, // $29/month
  },
  pro: {
    campaignsPerMonth: 40,
    regenerationsPerCampaign: 2,
    displayName: "Pro",
    price: 7900, // $79/month
  },
  agency: {
    campaignsPerMonth: 150,
    regenerationsPerCampaign: 2,
    displayName: "Agency",
    price: 19900, // $199/month
  },
};

// Map Stripe price IDs to plans (set via env vars)
export function getPlanFromPriceId(priceId: string): SubscriptionPlan {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return "agency";
  return "free";
}

export function getPriceIdForPlan(plan: SubscriptionPlan): string | null {
  switch (plan) {
    case "starter":
      return process.env.STRIPE_PRICE_STARTER || null;
    case "pro":
      return process.env.STRIPE_PRICE_PRO || null;
    case "agency":
      return process.env.STRIPE_PRICE_AGENCY || null;
    default:
      return null;
  }
}

export async function createCheckoutSession({
  customerId,
  priceId,
  userId,
  successUrl,
  cancelUrl,
}: {
  customerId?: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else {
    sessionParams.customer_creation = "always";
  }

  return stripe.checkout.sessions.create(sessionParams);
}

export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return null;
  }
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
