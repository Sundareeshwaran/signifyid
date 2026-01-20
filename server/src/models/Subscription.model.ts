/**
 * Subscription Model
 *
 * Database operations for Stripe subscription tracking
 */
import { query } from "../config/db.js";

export interface Subscription {
  id: string;
  org_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string;
  plan: string;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Find subscription by organization ID
 */
export async function findByOrgId(orgId: string): Promise<Subscription | null> {
  const result = await query(`SELECT * FROM subscriptions WHERE org_id = $1`, [
    orgId,
  ]);
  return (result.rows[0] as Subscription | undefined) || null;
}

/**
 * Find subscription by Stripe customer ID
 */
export async function findByStripeCustomerId(
  customerId: string
): Promise<Subscription | null> {
  const result = await query(
    `SELECT * FROM subscriptions WHERE stripe_customer_id = $1`,
    [customerId]
  );
  return (result.rows[0] as Subscription | undefined) || null;
}

/**
 * Find subscription by Stripe subscription ID
 */
export async function findByStripeSubscriptionId(
  subscriptionId: string
): Promise<Subscription | null> {
  const result = await query(
    `SELECT * FROM subscriptions WHERE stripe_subscription_id = $1`,
    [subscriptionId]
  );
  return (result.rows[0] as Subscription | undefined) || null;
}

/**
 * Create a new subscription record
 */
export async function create(data: {
  org_id: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  status?: string;
  plan?: string;
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end?: boolean;
}): Promise<Subscription> {
  const result = await query(
    `INSERT INTO subscriptions (
      org_id, stripe_customer_id, stripe_subscription_id, status, plan,
      current_period_start, current_period_end, cancel_at_period_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.org_id,
      data.stripe_customer_id,
      data.stripe_subscription_id || null,
      data.status || "inactive",
      data.plan || "free",
      data.current_period_start || null,
      data.current_period_end || null,
      data.cancel_at_period_end || false,
    ]
  );
  return result.rows[0] as Subscription;
}

/**
 * Update subscription by organization ID
 */
export async function updateByOrgId(
  orgId: string,
  data: Partial<{
    stripe_subscription_id: string | null;
    status: string;
    plan: string;
    current_period_start: Date;
    current_period_end: Date;
    cancel_at_period_end: boolean;
  }>
): Promise<Subscription | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.stripe_subscription_id !== undefined) {
    updates.push(`stripe_subscription_id = $${paramIndex++}`);
    values.push(data.stripe_subscription_id);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.plan !== undefined) {
    updates.push(`plan = $${paramIndex++}`);
    values.push(data.plan);
  }
  if (data.current_period_start !== undefined) {
    updates.push(`current_period_start = $${paramIndex++}`);
    values.push(data.current_period_start);
  }
  if (data.current_period_end !== undefined) {
    updates.push(`current_period_end = $${paramIndex++}`);
    values.push(data.current_period_end);
  }
  if (data.cancel_at_period_end !== undefined) {
    updates.push(`cancel_at_period_end = $${paramIndex++}`);
    values.push(data.cancel_at_period_end);
  }

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);
  values.push(orgId);

  const result = await query(
    `UPDATE subscriptions SET ${updates.join(
      ", "
    )} WHERE org_id = $${paramIndex} RETURNING *`,
    values
  );
  return (result.rows[0] as Subscription | undefined) || null;
}

/**
 * Upsert subscription - create if not exists, update if exists
 */
export async function upsert(data: {
  org_id: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  status?: string;
  plan?: string;
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end?: boolean;
}): Promise<Subscription> {
  const result = await query(
    `INSERT INTO subscriptions (
      org_id, stripe_customer_id, stripe_subscription_id, status, plan,
      current_period_start, current_period_end, cancel_at_period_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (org_id) DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
      status = EXCLUDED.status,
      plan = EXCLUDED.plan,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      updated_at = NOW()
    RETURNING *`,
    [
      data.org_id,
      data.stripe_customer_id,
      data.stripe_subscription_id || null,
      data.status || "inactive",
      data.plan || "free",
      data.current_period_start || null,
      data.current_period_end || null,
      data.cancel_at_period_end || false,
    ]
  );
  return result.rows[0] as Subscription;
}

/**
 * Delete subscription by organization ID
 */
export async function deleteByOrgId(orgId: string): Promise<boolean> {
  const result = await query(`DELETE FROM subscriptions WHERE org_id = $1`, [
    orgId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Sync organization plan with subscription plan
 * This keeps the organizations.plan field in sync with the subscription
 */
export async function syncOrgPlan(orgId: string, plan: string): Promise<void> {
  await query(`UPDATE organizations SET plan = $1 WHERE id = $2`, [
    plan,
    orgId,
  ]);
}
