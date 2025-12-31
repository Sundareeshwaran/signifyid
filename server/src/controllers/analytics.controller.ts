/**
 * Analytics Controller
 *
 * Handles analytics and reporting business logic
 */
import type { Request, Response } from "express";
import * as analyticsService from "../services/analytics.service.js";

/**
 * GET /analytics/overview - Complete analytics overview
 */
export async function getOverview(req: Request, res: Response): Promise<void> {
  try {
    const orgId = req.user!.org_id;

    const [users, sessions, clients, security, loginTrends] = await Promise.all(
      [
        analyticsService.getUserStats(orgId),
        analyticsService.getSessionStats(orgId),
        analyticsService.getClientUsageStats(orgId),
        analyticsService.getSecurityStats(orgId),
        analyticsService.getLoginTrends(orgId, 7),
      ]
    );

    res.json({
      users,
      sessions,
      clients,
      security,
      loginTrends,
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
}

/**
 * GET /analytics/login-trends - Daily login trends
 * Query params: days (default 7)
 */
export async function getLoginTrends(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const days = Math.min(
      Math.max(parseInt((req.query.days as string) || "7"), 1),
      90
    );

    const trends = await analyticsService.getLoginTrends(orgId, days);

    res.json({ trends, days });
  } catch (error) {
    console.error("Login trends error:", error);
    res.status(500).json({ error: "Failed to fetch login trends" });
  }
}

/**
 * GET /analytics/client-usage - Per-client usage stats
 */
export async function getClientUsage(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const stats = await analyticsService.getClientUsageStats(orgId);

    res.json(stats);
  } catch (error) {
    console.error("Client usage error:", error);
    res.status(500).json({ error: "Failed to fetch client usage" });
  }
}

/**
 * GET /analytics/security - Security metrics
 */
export async function getSecurity(req: Request, res: Response): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const stats = await analyticsService.getSecurityStats(orgId);

    res.json(stats);
  } catch (error) {
    console.error("Security stats error:", error);
    res.status(500).json({ error: "Failed to fetch security stats" });
  }
}

/**
 * GET /analytics/users - User analytics
 */
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const stats = await analyticsService.getUserStats(orgId);

    res.json(stats);
  } catch (error) {
    console.error("User stats error:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
}

/**
 * GET /analytics/sessions - Session analytics
 */
export async function getSessions(req: Request, res: Response): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const stats = await analyticsService.getSessionStats(orgId);

    res.json(stats);
  } catch (error) {
    console.error("Session stats error:", error);
    res.status(500).json({ error: "Failed to fetch session stats" });
  }
}

/**
 * GET /analytics/logins - Login activities time-series data
 * Query params: range (7d|30d|90d), group_by (day|hour)
 */
export async function getLoginActivities(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;

    // Validate and parse query parameters
    const range = (req.query.range as string) || "7d";
    const groupBy = (req.query.group_by as string) || "day";

    // Validate range
    if (!["7d", "30d", "90d"].includes(range)) {
      res.status(400).json({ error: "Invalid range. Must be 7d, 30d, or 90d" });
      return;
    }

    // Validate groupBy
    if (!["day", "hour"].includes(groupBy)) {
      res.status(400).json({ error: "Invalid group_by. Must be day or hour" });
      return;
    }

    // Fetch login activities
    const data = await analyticsService.getLoginActivities(
      orgId,
      range as "7d" | "30d" | "90d",
      groupBy as "day" | "hour"
    );

    // Audit log
    const AuditLog = await import("../models/AuditLog.model.js");
    await AuditLog.create(orgId, userId, "analytics_viewed", {
      type: "login_activities",
      range,
      groupBy,
      timestamp: new Date().toISOString(),
    });

    res.json({ data, range, groupBy });
  } catch (error) {
    console.error("Login activities error:", error);
    res.status(500).json({ error: "Failed to fetch login activities" });
  }
}
