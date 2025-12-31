/**
 * Billing Controller
 *
 * Handles Stripe billing operations including checkout, portal, and webhooks
 */
import type { Request, Response } from "express";
import { stripe, PRICE_ID_TO_PLAN, getPlanFeatures } from "../config/stripe.js";
import { config } from "../config/env.js";
import * as SubscriptionModel from "../models/Subscription.model.js";
import * as OrganizationModel from "../models/Organization.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import * as PlanLimitsService from "../services/planLimits.service.js";
import * as MailService from "../mail/mail.service.js";
import { query } from "../config/db.js";
import type Stripe from "stripe";

/**
 * GET /billing/config - Get Stripe publishable key and configuration
 * Public endpoint - no authentication required
 */
export async function getConfig(_req: Request, res: Response): Promise<void> {
  res.json({
    publishableKey: config.stripe.publishableKey,
    // Add plan prices for frontend reference
    prices: {
      starter: config.stripe.starterPriceId,
      professional: config.stripe.professionalPriceId,
    },
  });
}

/**
 * GET /billing/subscription - Get current subscription status
 */
export async function getSubscription(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orgId = req.user!.org_id;

    // Get organization details
    const org = await OrganizationModel.findById(orgId);
    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    // Get subscription if exists (may fail if table doesn't exist yet)
    let subscription = null;
    try {
      subscription = await SubscriptionModel.findByOrgId(orgId);
    } catch (dbError) {
      // Table might not exist yet - that's OK, just continue with null
      console.log("Subscriptions table not found or error:", dbError);
    }

    const planName = subscription?.plan || org.plan || "free";
    const features = getPlanFeatures(planName);

    // Get current usage
    const usage = await PlanLimitsService.getOrganizationUsage(orgId);

    res.json({
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            plan: subscription.plan,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          }
        : null,
      organization: {
        id: org.id,
        name: org.name,
        plan: planName,
      },
      features,
      usage,
      hasPaymentMethod: !!subscription?.stripe_customer_id,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ error: "Failed to get subscription" });
  }
}

/**
 * POST /billing/create-checkout-session - Create Stripe Checkout session for upgrade
 */
export async function createCheckoutSession(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;
    const { priceId } = req.body;

    if (!priceId) {
      res.status(400).json({ error: "Price ID is required" });
      return;
    }

    // Validate price ID
    const planName = PRICE_ID_TO_PLAN[priceId];
    if (!planName) {
      res.status(400).json({ error: "Invalid price ID" });
      return;
    }

    // Get organization
    const org = await OrganizationModel.findById(orgId);
    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    // Check for existing subscription
    const subscription = await SubscriptionModel.findByOrgId(orgId);
    let customerId = subscription?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user!.email,
        name: org.name,
        metadata: {
          org_id: orgId,
          user_id: userId,
        },
      });
      customerId = customer.id;

      // Create subscription record with customer ID
      await SubscriptionModel.create({
        org_id: orgId,
        stripe_customer_id: customerId,
        status: "inactive",
        plan: "free",
      });
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${config.frontendUrl}/dashboard/billing/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/dashboard/billing/checkout-canceled`,
      metadata: {
        org_id: orgId,
        user_id: userId,
        plan: planName,
      },
      subscription_data: {
        metadata: {
          org_id: orgId,
          plan: planName,
        },
      },
    });

    // Audit log
    await AuditLogModel.create(orgId, userId, "billing.checkout.started", {
      plan: planName,
      priceId,
      sessionId: session.id,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Create checkout session error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
}

/**
 * POST /billing/create-portal-session - Create Stripe Customer Portal session
 */
export async function createPortalSession(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;

    // Get subscription
    const subscription = await SubscriptionModel.findByOrgId(orgId);
    if (!subscription?.stripe_customer_id) {
      res.status(400).json({
        error: "No billing account found. Please subscribe to a plan first.",
      });
      return;
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${config.frontendUrl}/dashboard/billing`,
    });

    // Audit log
    await AuditLogModel.create(orgId, userId, "billing.portal.opened", {});

    res.json({ url: session.url });
  } catch (error) {
    console.error("Create portal session error:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
}

/**
 * POST /billing/webhook - Handle Stripe webhooks
 * Note: This endpoint uses raw body for signature verification
 */
export async function handleWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) {
    res.status(400).json({ error: "Missing signature" });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // Raw body buffer
      sig,
      config.stripe.webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const orgId = session.metadata?.org_id;
  const plan = session.metadata?.plan;

  if (!orgId) {
    console.error("No org_id in checkout session metadata");
    return;
  }

  console.log(`Checkout completed for org ${orgId}, plan: ${plan}`);

  // Subscription will be created/updated via subscription webhook
  // Just log the event here
  await AuditLogModel.create(orgId, null, "billing.checkout.completed", {
    sessionId: session.id,
    plan,
    customerId: session.customer,
  });
}

/**
 * Handle subscription created/updated event
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const orgId = subscription.metadata?.org_id;
  const customerId = subscription.customer as string;

  if (!orgId) {
    // Try to find by customer ID
    const existingSub = await SubscriptionModel.findByStripeCustomerId(
      customerId
    );
    if (!existingSub) {
      console.error(
        "Cannot find organization for subscription:",
        subscription.id
      );
      return;
    }
    // Use the org_id from existing subscription
    await processSubscriptionUpdate(existingSub.org_id, subscription);
  } else {
    await processSubscriptionUpdate(orgId, subscription);
  }
}

/**
 * Process subscription update
 */
async function processSubscriptionUpdate(
  orgId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  // Get plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? PRICE_ID_TO_PLAN[priceId] || "free" : "free";

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    trialing: "trialing",
    incomplete: "inactive",
    incomplete_expired: "inactive",
    paused: "inactive",
  };
  const status = statusMap[subscription.status] || "inactive";

  // Upsert subscription
  // Note: current_period_start/end are in seconds since epoch
  const periodStart = (
    subscription as unknown as { current_period_start?: number }
  ).current_period_start;
  const periodEnd = (subscription as unknown as { current_period_end?: number })
    .current_period_end;

  await SubscriptionModel.upsert({
    org_id: orgId,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    status,
    plan,
    current_period_start: periodStart
      ? new Date(periodStart * 1000)
      : undefined,
    current_period_end: periodEnd ? new Date(periodEnd * 1000) : undefined,
    cancel_at_period_end: subscription.cancel_at_period_end,
  });

  // Sync organization plan
  await SubscriptionModel.syncOrgPlan(orgId, plan);

  // Audit log
  await AuditLogModel.create(orgId, null, "billing.subscription.updated", {
    subscriptionId: subscription.id,
    status,
    plan,
  });

  // Send billing success email if subscription is active
  if (status === "active") {
    sendBillingEmailToAdmins(orgId, "success", {
      planName: plan.charAt(0).toUpperCase() + plan.slice(1),
      invoiceId: subscription.id,
      nextSteps: "Thank you for your subscription! Your plan is now active.",
    });
  }

  console.log(`Subscription updated for org ${orgId}: ${status} - ${plan}`);
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;

  // Find subscription by customer ID
  const existingSub = await SubscriptionModel.findByStripeCustomerId(
    customerId
  );
  if (!existingSub) {
    console.error(
      "Cannot find subscription for deleted event:",
      subscription.id
    );
    return;
  }

  // Update to canceled/free
  await SubscriptionModel.updateByOrgId(existingSub.org_id, {
    status: "canceled",
    plan: "free",
    stripe_subscription_id: null,
  });

  // Sync organization plan back to free
  await SubscriptionModel.syncOrgPlan(existingSub.org_id, "free");

  // Audit log
  await AuditLogModel.create(
    existingSub.org_id,
    null,
    "billing.subscription.canceled",
    {
      subscriptionId: subscription.id,
    }
  );

  // Send cancellation email
  sendBillingEmailToAdmins(existingSub.org_id, "cancelled", {
    planName: existingSub.plan || "Subscription",
    invoiceId: subscription.id,
    nextSteps:
      "Your subscription has been cancelled. You will continue to have access until the end of your billing period.",
  });

  console.log(`Subscription canceled for org ${existingSub.org_id}`);
}

/**
 * Handle invoice payment failed event
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  // Find subscription by customer ID
  const existingSub = await SubscriptionModel.findByStripeCustomerId(
    customerId
  );
  if (!existingSub) {
    console.error("Cannot find subscription for payment failed:", invoice.id);
    return;
  }

  // Audit log
  await AuditLogModel.create(
    existingSub.org_id,
    null,
    "billing.payment.failed",
    {
      invoiceId: invoice.id,
      amount: invoice.amount_due,
      attemptCount: invoice.attempt_count,
    }
  );

  // Send payment failed email
  sendBillingEmailToAdmins(existingSub.org_id, "failed", {
    invoiceId: invoice.id || undefined,
    amount: invoice.amount_due
      ? `$${(invoice.amount_due / 100).toFixed(2)}`
      : undefined,
    nextSteps:
      "Please update your payment method to avoid service interruption.",
  });

  console.log(`Payment failed for org ${existingSub.org_id}`);
}

/**
 * Helper function to send billing emails to org admins
 */
async function sendBillingEmailToAdmins(
  orgId: string,
  eventType: "success" | "failed" | "refunded" | "cancelled",
  options: {
    planName?: string;
    invoiceId?: string;
    amount?: string;
    nextSteps?: string;
  }
): Promise<void> {
  try {
    // Get organization details
    const org = await OrganizationModel.findById(orgId);
    if (!org) return;

    // Get admin emails (super_admin and tenant_admin)
    const result = await query(
      `SELECT DISTINCT u.id, u.email, u.display_name
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE u.org_id = $1
         AND u.status = 'active'
         AND r.name IN ('super_admin', 'tenant_admin')`,
      [orgId]
    );

    const admins = result.rows as Array<{
      id: string;
      email: string;
      display_name: string;
    }>;

    // Send email to each admin
    for (const admin of admins) {
      await MailService.sendBillingEmail(
        {
          recipientName: admin.display_name || admin.email.split("@")[0],
          organizationName: org.name,
          eventType,
          invoiceId: options.invoiceId,
          amount: options.amount,
          planName: options.planName,
          nextSteps: options.nextSteps,
          supportEmail: config.mail.from,
        },
        admin.email,
        orgId,
        `${eventType}-${options.invoiceId || Date.now()}`
      );
    }
  } catch (error) {
    console.error(`Failed to send billing ${eventType} emails:`, error);
  }
}
