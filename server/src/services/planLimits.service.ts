/**
 * Plan Limits Service
 *
 * Tracks and enforces plan-based resource limits
 */
import { query } from "../config/db.js";
import * as OrganizationModel from "../models/Organization.model.js";
import { getPlanFeatures } from "../config/stripe.js";

export interface UsageData {
  users: { current: number; max: number };
  clients: { current: number; max: number };
}

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  max: number;
  message?: string;
}

/**
 * Get current resource usage counts for an organization
 */
export async function getOrganizationUsage(orgId: string): Promise<UsageData> {
  // Count active users (not disabled)
  const usersResult = await query(
    `SELECT COUNT(*) as count FROM users WHERE org_id = $1 AND status != 'disabled'`,
    [orgId]
  );
  const userCount = parseInt(usersResult.rows[0]?.count || "0", 10);

  // Count active clients
  const clientsResult = await query(
    `SELECT COUNT(*) as count FROM clients WHERE org_id = $1 AND is_active = true`,
    [orgId]
  );
  const clientCount = parseInt(clientsResult.rows[0]?.count || "0", 10);

  // Get organization's plan
  const org = await OrganizationModel.findById(orgId);
  const planName = org?.plan || "free";
  const features = getPlanFeatures(planName);

  return {
    users: {
      current: userCount,
      max: features.maxUsers,
    },
    clients: {
      current: clientCount,
      max: features.maxClients,
    },
  };
}

/**
 * Check if organization can create a new user
 */
export async function canCreateUser(orgId: string): Promise<LimitCheckResult> {
  const usage = await getOrganizationUsage(orgId);
  const { current, max } = usage.users;

  // -1 means unlimited
  if (max === -1) {
    return { allowed: true, current, max };
  }

  if (current >= max) {
    return {
      allowed: false,
      current,
      max,
      message: `User limit reached (${current}/${max}). Upgrade your plan to add more users.`,
    };
  }

  return { allowed: true, current, max };
}

/**
 * Check if organization can create a new OAuth client
 */
export async function canCreateClient(
  orgId: string
): Promise<LimitCheckResult> {
  const usage = await getOrganizationUsage(orgId);
  const { current, max } = usage.clients;

  // -1 means unlimited
  if (max === -1) {
    return { allowed: true, current, max };
  }

  if (current >= max) {
    return {
      allowed: false,
      current,
      max,
      message: `OAuth client limit reached (${current}/${max}). Upgrade your plan to add more clients.`,
    };
  }

  return { allowed: true, current, max };
}

/**
 * Get plan limits for an organization
 */
export async function getOrganizationLimits(orgId: string) {
  const org = await OrganizationModel.findById(orgId);
  const planName = org?.plan || "free";
  return getPlanFeatures(planName);
}
