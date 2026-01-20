/**
 * Stripe Configuration
 *
 * Initialize Stripe SDK and define plan mappings
 */
import Stripe from "stripe";
import { config } from "./env.js";

// Lazy-initialize Stripe - allows server to start even if key not configured
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!config.stripe.secretKey) {
      throw new Error(
        "Stripe is not configured. Set STRIPE_SECRET_KEY in environment."
      );
    }
    _stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// Backward compatibility export
export const stripe = {
  get customers() {
    return getStripe().customers;
  },
  get checkout() {
    return getStripe().checkout;
  },
  get billingPortal() {
    return getStripe().billingPortal;
  },
  get webhooks() {
    return getStripe().webhooks;
  },
};

// Plan to Price ID mappings
export const PLAN_PRICE_IDS: Record<string, string> = {
  starter: config.stripe.starterPriceId,
  professional: config.stripe.professionalPriceId,
};

// Price ID to Plan mappings (reverse lookup)
export const PRICE_ID_TO_PLAN: Record<string, string> = Object.entries(
  PLAN_PRICE_IDS
).reduce((acc, [plan, priceId]) => {
  if (priceId) acc[priceId] = plan;
  return acc;
}, {} as Record<string, string>);

// Plan features for feature gating
export const PLAN_FEATURES = {
  free: {
    maxUsers: 10,
    maxClients: 2,
    auditLogDays: 7,
    mfaTypes: ["totp"],
    ssoEnabled: false,
    customBranding: false,
  },
  starter: {
    maxUsers: 50,
    maxClients: 10,
    auditLogDays: 30,
    mfaTypes: ["totp", "webauthn"],
    ssoEnabled: false,
    customBranding: true,
  },
  professional: {
    maxUsers: 500,
    maxClients: -1, // unlimited
    auditLogDays: 365,
    mfaTypes: ["totp", "webauthn", "sms"],
    ssoEnabled: true,
    customBranding: true,
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxClients: -1, // unlimited
    auditLogDays: -1, // unlimited
    mfaTypes: ["totp", "webauthn", "sms", "custom"],
    ssoEnabled: true,
    customBranding: true,
  },
};

/**
 * Get plan features by plan name
 */
export function getPlanFeatures(plan: string) {
  return (
    PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.free
  );
}
