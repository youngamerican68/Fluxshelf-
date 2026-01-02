/**
 * Feature flags for FluxShield
 * Controls optional features that can be enabled/disabled via environment variables
 */

/**
 * Check if Stripe billing is enabled
 * When disabled:
 * - Stripe SDK never initializes
 * - Billing UI shows "Billing coming soon"
 * - Stripe routes return 404/501
 * - Free tier quotas still enforced
 *
 * Default: false (Stripe disabled)
 */
export function isStripeEnabled(): boolean {
  return process.env.ENABLE_STRIPE === "true";
}
