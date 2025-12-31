/**
 * Dashboard Controller
 *
 * Handles dashboard statistics and activity feed business logic
 */
import type { Request, Response } from "express";
import { query } from "../config/db.js";

/**
 * GET /dashboard/stats - Get aggregated dashboard statistics
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const orgId = req.user?.org_id;

    // Run all queries in parallel
    const [
      usersResult,
      clientsResult,
      sessionsResult,
      logsResult,
      riskResult,
      devicesResult,
      orgResult,
    ] = await Promise.all([
      // User stats
      query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week
         FROM users WHERE org_id = $1`,
        [orgId]
      ),
      // Client stats
      query(`SELECT COUNT(*) as total FROM clients WHERE org_id = $1`, [orgId]),
      // Session stats
      query(
        `SELECT 
          COUNT(*) as active_sessions,
          COUNT(DISTINCT user_id) as unique_users
         FROM tokens t
         JOIN users u ON t.user_id = u.id
         WHERE u.org_id = $1 AND t.revoked = FALSE AND t.expires_at > NOW()`,
        [orgId]
      ),
      // Activity logs stats
      query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as this_week
         FROM audit_logs WHERE org_id = $1`,
        [orgId]
      ),
      // Risk events stats
      query(
        `SELECT 
          COUNT(*) FILTER (WHERE risk_score > 0.7) as high_risk,
          COUNT(*) FILTER (WHERE risk_score > 0.3 AND risk_score <= 0.7) as medium_risk,
          COUNT(*) FILTER (WHERE decision = 'blocked') as blocked
         FROM risk_events r
         JOIN users u ON r.user_id = u.id
         WHERE u.org_id = $1 AND r.created_at > NOW() - INTERVAL '30 days'`,
        [orgId]
      ),
      // Trusted devices (low risk score only)
      query(
        `SELECT COUNT(*) as total FROM devices d
         JOIN users u ON d.user_id = u.id
         WHERE u.org_id = $1 AND d.risk_score <= 0.3`,
        [orgId]
      ),
      // Organization info
      query(
        `SELECT name, domain, plan, created_at FROM organizations WHERE id = $1`,
        [orgId]
      ),
    ]);

    const users = usersResult.rows[0];
    const clients = clientsResult.rows[0];
    const sessions = sessionsResult.rows[0];
    const logs = logsResult.rows[0];
    const risk = riskResult.rows[0];
    const devices = devicesResult.rows[0];
    const org = orgResult.rows[0];

    res.json({
      organization: {
        name: org?.name,
        domain: org?.domain,
        plan: org?.plan || "free",
        createdAt: org?.created_at,
      },
      users: {
        total: parseInt(users?.total) || 0,
        active: parseInt(users?.active) || 0,
        newThisWeek: parseInt(users?.new_this_week) || 0,
      },
      clients: {
        total: parseInt(clients?.total) || 0,
      },
      sessions: {
        active: parseInt(sessions?.active_sessions) || 0,
        uniqueUsers: parseInt(sessions?.unique_users) || 0,
      },
      activity: {
        totalLogs: parseInt(logs?.total) || 0,
        logsToday: parseInt(logs?.today) || 0,
        logsThisWeek: parseInt(logs?.this_week) || 0,
      },
      security: {
        highRiskEvents: parseInt(risk?.high_risk) || 0,
        mediumRiskEvents: parseInt(risk?.medium_risk) || 0,
        blockedAttempts: parseInt(risk?.blocked) || 0,
        trustedDevices: parseInt(devices?.total) || 0,
      },
    });
  } catch (error) {
    console.error("GET /dashboard/stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
}

/**
 * GET /dashboard/activity - Get recent activity for the dashboard
 */
export async function getActivity(req: Request, res: Response): Promise<void> {
  try {
    const orgId = req.user?.org_id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const result = await query(
      `SELECT 
        al.id,
        al.action,
        al.meta,
        al.created_at,
        u.email as user_email,
        u.display_name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.org_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [orgId, limit]
    );

    res.json({
      activity: result.rows.map((row) => ({
        id: row.id,
        action: row.action,
        meta: row.meta,
        createdAt: row.created_at,
        userEmail: row.user_email,
        userName: row.user_name,
      })),
    });
  } catch (error) {
    console.error("GET /dashboard/activity error:", error);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
}
