"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, ArrowUpRight } from "lucide-react";
import type { SubscriptionPlan } from "@/types/database";

interface BillingActionsProps {
  currentPlan: SubscriptionPlan;
  stripeCustomerId: string | null;
}

const UPGRADE_PLANS: Array<{
  id: SubscriptionPlan;
  name: string;
  price: string;
}> = [
  { id: "starter", name: "Starter", price: "$29/mo" },
  { id: "pro", name: "Pro", price: "$79/mo" },
  { id: "agency", name: "Agency", price: "$199/mo" },
];

export function BillingActions({
  currentPlan,
  stripeCustomerId,
}: BillingActionsProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("starter");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const availablePlans = UPGRADE_PLANS.filter((p) => {
    const order = { free: 0, starter: 1, pro: 2, agency: 3 };
    return order[p.id] > order[currentPlan];
  });

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!stripeCustomerId) {
      toast({
        title: "No subscription",
        description: "You don't have an active subscription to manage",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to access billing portal");
      }

      window.location.href = data.url;
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-4">
      {currentPlan === "free" || availablePlans.length > 0 ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upgrade Your Plan</DialogTitle>
              <DialogDescription>
                Choose a plan that fits your needs
              </DialogDescription>
            </DialogHeader>

            <RadioGroup
              value={selectedPlan}
              onValueChange={(v) => setSelectedPlan(v as SubscriptionPlan)}
              className="space-y-3"
            >
              {availablePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted cursor-pointer"
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <RadioGroupItem value={plan.id} id={plan.id} />
                  <Label
                    htmlFor={plan.id}
                    className="flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <span className="font-medium">{plan.name}</span>
                    <span className="text-muted-foreground">{plan.price}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Continue to Checkout
            </Button>
          </DialogContent>
        </Dialog>
      ) : null}

      {stripeCustomerId && (
        <Button
          variant="outline"
          onClick={handleManageSubscription}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Manage Subscription
        </Button>
      )}
    </div>
  );
}
