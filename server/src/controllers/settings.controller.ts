/**
 * Settings Controller
 *
 * Handles application settings management business logic
 */
import type { Request, Response } from "express";
import * as OrganizationModel from "../models/Organization.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import { query } from "../config/db.js";

/**
 * GET /settings/organization - Get organization settings
 */
export async function getOrganization(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const org = await OrganizationModel.findById(orgId);

    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    res.json({
      id: org.id,
      name: org.name,
      domain: org.domain,
      plan: org.plan || "free",
      createdAt: org.created_at,
    });
  } catch (error) {
    console.error("Get organization error:", error);
    res.status(500).json({ error: "Failed to get organization settings" });
  }
}

/**
 * PATCH /settings/organization - Update organization settings
 */
export async function updateOrganization(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;
    const { name, domain } = req.body;

    // Validate input
    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim().length < 2)
    ) {
      res.status(400).json({ error: "Name must be at least 2 characters" });
      return;
    }

    if (domain !== undefined) {
      if (typeof domain !== "string" || domain.trim().length < 3) {
        res.status(400).json({ error: "Domain must be at least 3 characters" });
        return;
      }

      // Check domain availability
      const isAvailable = await OrganizationModel.isDomainAvailable(
        domain,
        orgId
      );
      if (!isAvailable) {
        res.status(409).json({ error: "Domain is already in use" });
        return;
      }
    }

    // Update organization
    const updated = await OrganizationModel.update(orgId, {
      name: name?.trim(),
      domain: domain?.trim(),
    });

    if (!updated) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    // Audit log
    await AuditLogModel.create(orgId, userId, "org.settings.updated", {
      changes: { name, domain },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      domain: updated.domain,
      plan: updated.plan || "free",
      createdAt: updated.created_at,
    });
  } catch (error) {
    console.error("Update organization error:", error);
    res.status(500).json({ error: "Failed to update organization settings" });
  }
}

/**
 * GET /settings/security - Get security settings
 * For MVP, returning static/default values
 */
export async function getSecurity(req: Request, res: Response): Promise<void> {
  try {
    const orgId = req.user!.org_id;

    // Get MFA stats
    const mfaResult = await query(
      `SELECT 
        COUNT(DISTINCT m.user_id) as mfa_enabled_users,
        COUNT(DISTINCT u.id) as total_users
       FROM users u
       LEFT JOIN mfa_methods m ON u.id = m.user_id AND m.verified = TRUE
       WHERE u.org_id = $1`,
      [orgId]
    );

    const stats = mfaResult.rows[0];

    res.json({
      sessionTimeout: 60, // minutes (from env default)
      mfaPolicy: "optional", // optional | required_admins | required_all
      mfaEnabledUsers: parseInt(stats?.mfa_enabled_users) || 0,
      totalUsers: parseInt(stats?.total_users) || 0,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecial: false,
      },
      loginThrottling: true,
    });
  } catch (error) {
    console.error("Get security settings error:", error);
    res.status(500).json({ error: "Failed to get security settings" });
  }
}

/**
 * PATCH /settings/security - Update security settings
 * For MVP, just log the request (actual implementation would store in DB)
 */
export async function updateSecurity(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;
    const { sessionTimeout, mfaPolicy, passwordPolicy, loginThrottling } =
      req.body;

    // Audit log the change request
    await AuditLogModel.create(orgId, userId, "security.settings.updated", {
      changes: { sessionTimeout, mfaPolicy, passwordPolicy, loginThrottling },
    });

    // For MVP, return the requested settings as if they were saved
    res.json({
      sessionTimeout: sessionTimeout || 60,
      mfaPolicy: mfaPolicy || "optional",
      passwordPolicy: passwordPolicy || {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecial: false,
      },
      loginThrottling: loginThrottling ?? true,
      message: "Security settings updated",
    });
  } catch (error) {
    console.error("Update security settings error:", error);
    res.status(500).json({ error: "Failed to update security settings" });
  }
}

/**
 * GET /settings/billing - Get billing/plan information
 */
export async function getBilling(req: Request, res: Response): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const org = await OrganizationModel.findById(orgId);

    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    res.json({
      plan: org.plan || "free",
      status: "active",
      features: {
        maxUsers: org.plan === "pro" ? 100 : 10,
        maxClients: org.plan === "pro" ? 50 : 5,
        mfaEnabled: true,
        auditLogs: true,
        customBranding: org.plan === "pro",
      },
      usage: {
        users: 0, // Would query actual counts
        clients: 0,
      },
    });
  } catch (error) {
    console.error("Get billing error:", error);
    res.status(500).json({ error: "Failed to get billing information" });
  }
}
