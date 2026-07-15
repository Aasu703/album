import { loadStripe, type Stripe } from "@stripe/stripe-js";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

/** True once a real (non-placeholder) Stripe publishable key is configured. */
export const isStripeConfigured = Boolean(PUBLISHABLE_KEY && !PUBLISHABLE_KEY.includes("your_key"));

let stripePromise: Promise<Stripe | null> | null = null;

/** Lazily loads and memoizes the Stripe.js client, per Stripe's recommended singleton pattern. */
export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(PUBLISHABLE_KEY ?? "");
  }
  return stripePromise;
}
