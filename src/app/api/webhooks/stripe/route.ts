import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe, getPlanFromPriceId } from "@/lib/stripe";
import { isStripeEnabled } from "@/lib/flags";
import type { Database } from "@/types/database";

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  // Check Stripe feature flag first
  if (!isStripeEnabled()) {
    return NextResponse.json(
      { error: "Stripe webhooks are not enabled" },
      { status: 404 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error("No userId in checkout session metadata");
          break;
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);

        // Update subscription in database
        await (supabase.from("subscriptions") as any)
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan,
            status: subscription.status,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq("owner_id", userId);

        console.log(`Subscription created for user ${userId}: ${plan}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);

        // Find subscription by customer ID
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        const subId = (existingSub as { id: string } | null)?.id;

        if (subId) {
          await (supabase.from("subscriptions") as any)
            .update({
              plan,
              status: subscription.status,
              current_period_start: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
            })
            .eq("id", subId);

          console.log(`Subscription updated: ${plan}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Reset to free plan
        await (supabase.from("subscriptions") as any)
          .update({
            plan: "free",
            status: "canceled",
            stripe_subscription_id: null,
          })
          .eq("stripe_customer_id", customerId);

        console.log(`Subscription canceled for customer ${customerId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Update status
        await (supabase.from("subscriptions") as any)
          .update({ status: "past_due" })
          .eq("stripe_customer_id", customerId);

        console.log(`Payment failed for customer ${customerId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
