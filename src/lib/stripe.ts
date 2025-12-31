/**
 * Stripe Client Configuration (Frontend)
 *
 * This module provides the Stripe client for frontend payment integration.
 * Uses the publishable key (public) for client-side Stripe Elements.
 *
 * Required environment variable:
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY - Your Stripe publishable key (starts with pk_)
 */
import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Cache the Stripe promise to avoid loading multiple times
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get the Stripe publishable key from environment
 */
export function getStripePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.warn(
      "Stripe publishable key not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env.local file."
    );
    return "";
  }
  return key;
}

/**
 * Get the Stripe client instance (for use with Stripe Elements)
 * This is lazy-loaded and cached for performance
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = getStripePublishableKey();
    if (publishableKey) {
      stripePromise = loadStripe(publishableKey);
    } else {
      stripePromise = Promise.resolve(null);
    }
  }
  return stripePromise;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}
