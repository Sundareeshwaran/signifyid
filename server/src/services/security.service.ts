import { query } from "../config/db.js";

/**
 * Security Overview Service
 *
 * Provides real-time computed security metrics for organization dashboards
 */

interface SecurityOverview {
  highRisk: number;
  mediumRisk: number;
  failedLogins24h: number;
  blockedAttempts: number;
  officeHoursAnomalies: number;
}

/**
 * Get Security Overview Metrics
 *
 * Calculates real-time security metrics from audit logs:
 * - High risk events (last 7 days)
 * - Medium risk events (last 7 days)
 * - Failed login attempts (last 24 hours)
 * - Blocked authentication attempts (last 7 days)
 * - Office hours anomalies (logins outside 9am-5pm IST, last 7 days)
 */
export async function getSecurityOverview(
  orgId: string
): Promise<SecurityOverview> {
  // High Risk Events (last 7 days)
  const highRiskResult = await query(
    `SELECT COUNT(*) as count
     FROM audit_logs
     WHERE org_id = $1
       AND meta->>'risk_level' = 'high'
       AND created_at > NOW() - INTERVAL '7 days'`,
    [orgId]
  );

  // Medium Risk Events (last 7 days)
  const mediumRiskResult = await query(
    `SELECT COUNT(*) as count
     FROM audit_logs
     WHERE org_id = $1
       AND meta->>'risk_level' = 'medium'
       AND created_at > NOW() - INTERVAL '7 days'`,
    [orgId]
  );

  // Failed Logins (last 24 hours)
  const failedLoginsResult = await query(
    `SELECT COUNT(*) as count
     FROM audit_logs
     WHERE org_id = $1
       AND action = 'auth.login_failed'
       AND created_at > NOW() - INTERVAL '24 hours'`,
    [orgId]
  );

  // Blocked Attempts (last 7 days)
  const blockedAttemptsResult = await query(
    `SELECT COUNT(*) as count
     FROM audit_logs
     WHERE org_id = $1
       AND (
         meta->>'status' = 'blocked'
         OR action LIKE '%blocked%'
         OR action LIKE '%rate_limit%'
       )
       AND created_at > NOW() - INTERVAL '7 days'`,
    [orgId]
  );

  // Office Hours Anomalies (logins outside 9am-5pm IST, last 7 days)
  // IST is UTC +5:30
  const officeHoursAnomaliesResult = await query(
    `SELECT COUNT(*) as count
     FROM audit_logs
     WHERE org_id = $1
       AND action IN ('auth.login', 'client_login_success')
       AND (
         EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata') < 9
         OR EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata') >= 17
       )
       AND created_at > NOW() - INTERVAL '7 days'`,
    [orgId]
  );

  return {
    highRisk: parseInt(highRiskResult.rows[0]?.count) || 0,
    mediumRisk: parseInt(mediumRiskResult.rows[0]?.count) || 0,
    failedLogins24h: parseInt(failedLoginsResult.rows[0]?.count) || 0,
    blockedAttempts: parseInt(blockedAttemptsResult.rows[0]?.count) || 0,
    officeHoursAnomalies:
      parseInt(officeHoursAnomaliesResult.rows[0]?.count) || 0,
  };
}
