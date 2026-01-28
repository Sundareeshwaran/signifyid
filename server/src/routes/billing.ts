/**
 * Billing Routes
 *
 * Stripe billing and subscription management endpoints
 *
 * GET    /api/billing/subscription           - Get current subscription
 * POST   /api/billing/create-checkout-session - Create Stripe Checkout
 * POST   /api/billing/create-portal-session   - Create Customer Portal
 * POST   /api/billing/webhook                 - Stripe webhook (unauthed)
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import * as billingController from "../controllers/billing.controller.js";

const router: IRouter = Router();

/**
 * GET /billing/config - Get Stripe publishable key and plan prices
 * Public endpoint - no authentication required
 */
router.get("/config", billingController.getConfig);

/**
 * GET /billing/subscription - Get current subscription status
 * Requires authentication and billing:read permission
 */
router.get(
  "/subscription",
  requireAuth,
  requirePermission("billing:read"),
  billingController.getSubscription
);

/**
 * POST /billing/create-checkout-session - Create Stripe Checkout session
 * Requires authentication and billing:manage permission
 */
router.post(
  "/create-checkout-session",
  requireAuth,
  requirePermission("billing:manage"),
  billingController.createCheckoutSession
);

/**
 * POST /billing/create-portal-session - Create Stripe Customer Portal session
 * Requires authentication and billing:manage permission
 */
router.post(
  "/create-portal-session",
  requireAuth,
  requirePermission("billing:manage"),
  billingController.createPortalSession
);

/**
 * POST /billing/webhook - Handle Stripe webhooks
 * No authentication - uses Stripe signature verification
 * Note: Raw body parsing is configured in index.ts
 */
router.post("/webhook", billingController.handleWebhook);

export default router;
