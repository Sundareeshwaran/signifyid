import { Request, Response } from "express";
import * as securityService from "../services/security.service.js";

/**
 * Get Security Overview
 *
 * Returns real-time computed security metrics for the organization
 *
 * @route GET /api/security/overview
 * @access Requires: security:overview:read permission
 */
export async function getSecurityOverview(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;

    // Fetch security overview metrics
    const metrics = await securityService.getSecurityOverview(orgId);

    // Audit log
    const AuditLog = await import("../models/AuditLog.model.js");
    await AuditLog.create(orgId, userId, "security_overview_viewed", {
      timestamp: new Date().toISOString(),
      metrics: {
        highRisk: metrics.highRisk,
        mediumRisk: metrics.mediumRisk,
        failedLogins24h: metrics.failedLogins24h,
        blockedAttempts: metrics.blockedAttempts,
        officeHoursAnomalies: metrics.officeHoursAnomalies,
      },
    });

    res.json(metrics);
  } catch (error) {
    console.error("Security overview error:", error);
    res.status(500).json({ error: "Failed to fetch security overview" });
  }
}
