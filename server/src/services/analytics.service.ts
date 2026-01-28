/**
 * Analytics Service
 *
 * Provides aggregated analytics from real database activity.
 * All queries are tenant-scoped for org isolation.
 */
import { query } from "../config/db.js";
import * as analyticsCache from "../cache/analytics.cache.js";

/**
 * User Analytics
 */
export async function getUserStats(orgId: string) {
  // Try cache first
  const cached = await analyticsCache.get<
    ReturnType<typeof getUserStatsFromDb>
  >("userStats", orgId);
  if (cached) return cached;

  const result = await getUserStatsFromDb(orgId);
  await analyticsCache.set("userStats", orgId, result);
  return result;
}

async function getUserStatsFromDb(orgId: string) {
  const result = await query(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'disabled') as disabled,
      COUNT(*) FILTER (WHERE status = 'invited') as invited,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_7d,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_30d
     FROM users WHERE org_id = $1`,
    [orgId]
  );

  // MFA-enabled users
  const mfaResult = await query(
    `SELECT COUNT(DISTINCT m.user_id) as mfa_enabled
     FROM mfa_methods m
     JOIN users u ON m.user_id = u.id
     WHERE u.org_id = $1 AND m.verified = TRUE`,
    [orgId]
  );

  const stats = result.rows[0];
  const total = parseInt(stats?.total) || 0;
  const mfaEnabled = parseInt(mfaResult.rows[0]?.mfa_enabled) || 0;

  return {
    total,
    active: parseInt(stats?.active) || 0,
    disabled: parseInt(stats?.disabled) || 0,
    invited: parseInt(stats?.invited) || 0,
    new7Days: parseInt(stats?.new_7d) || 0,
    new30Days: parseInt(stats?.new_30d) || 0,
    mfaEnabled,
    mfaPercentage: total > 0 ? Math.round((mfaEnabled / total) * 100) : 0,
  };
}

/**
 * Login Trends - Daily login counts
 */
export async function getLoginTrends(orgId: string, days: number = 7) {
  const result = await query(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) FILTER (WHERE action IN ('auth.login', 'client_login_success')) as success,
      COUNT(*) FILTER (WHERE action = 'auth.login_failed') as failed
     FROM audit_logs
     WHERE org_id = $1 
       AND created_at > NOW() - INTERVAL '1 day' * $2
       AND action IN ('auth.login', 'client_login_success', 'auth.login_failed')
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [orgId, days]
  );

  return result.rows.map((row) => ({
    date: row.date,
    success: parseInt(row.success) || 0,
    failed: parseInt(row.failed) || 0,
  }));
}

/**
 * Login Activities - Time-series login data for analytics
 * Supports different time ranges and grouping intervals
 */
export async function getLoginActivities(
  orgId: string,
  range: "7d" | "30d" | "90d" = "7d",
  groupBy: "day" | "hour" = "day"
) {
  // Calculate days from range
  const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[range];

  // Build the SQL query based on grouping
  let timeGrouping: string;
  let dateFormat: string;

  if (groupBy === "hour") {
    timeGrouping = "DATE_TRUNC('hour', created_at)";
    dateFormat = "YYYY-MM-DD HH24:MI";
  } else {
    timeGrouping = "DATE(created_at)";
    dateFormat = "YYYY-MM-DD";
  }

  const result = await query(
    `SELECT 
      TO_CHAR(${timeGrouping}, '${dateFormat}') as date,
      COUNT(*) as count
     FROM audit_logs
     WHERE org_id = $1 
       AND created_at > NOW() - INTERVAL '1 day' * $2
       AND action IN ('auth.login', 'client_login_success')
     GROUP BY ${timeGrouping}
     ORDER BY ${timeGrouping}`,
    [orgId, days]
  );

  return result.rows.map((row) => ({
    date: row.date,
    count: parseInt(row.count) || 0,
  }));
}

/**
 * Session Analytics
 */
export async function getSessionStats(orgId: string) {
  // Active sessions count
  const activeResult = await query(
    `SELECT 
      COUNT(*) as active,
      COUNT(DISTINCT user_id) as unique_users
     FROM sessions
     WHERE org_id = $1 AND revoked = FALSE AND expires_at > NOW()`,
    [orgId]
  );

  // Sessions by client
  const byClientResult = await query(
    `SELECT 
      c.name as client_name,
      c.client_id,
      COUNT(s.id) as session_count
     FROM sessions s
     LEFT JOIN clients c ON s.client_id = c.id
     WHERE s.org_id = $1 AND s.revoked = FALSE AND s.expires_at > NOW()
     GROUP BY c.id, c.name, c.client_id
     ORDER BY session_count DESC
     LIMIT 10`,
    [orgId]
  );

  const active = activeResult.rows[0];

  return {
    active: parseInt(active?.active) || 0,
    uniqueUsers: parseInt(active?.unique_users) || 0,
    byClient: byClientResult.rows.map((row) => ({
      clientName: row.client_name || "Direct Login",
      clientId: row.client_id,
      sessionCount: parseInt(row.session_count) || 0,
    })),
  };
}

/**
 * Client (OAuth App) Usage Analytics
 */
export async function getClientUsageStats(orgId: string) {
  // Client list with active session counts (instead of tokens, since tokens don't have client_id)
  const result = await query(
    `SELECT 
      c.id,
      c.client_id,
      c.name,
      c.created_at,
      COUNT(DISTINCT s.id) FILTER (WHERE s.revoked = FALSE AND s.expires_at > NOW()) as active_sessions,
      COUNT(DISTINCT s.id) as total_sessions
     FROM clients c
     LEFT JOIN sessions s ON s.client_id = c.id
     WHERE c.org_id = $1
     GROUP BY c.id
     ORDER BY active_sessions DESC`,
    [orgId]
  );

  // Login counts per client (from audit logs with client_id in meta)
  const loginsResult = await query(
    `SELECT 
      meta->>'client_id' as client_id,
      COUNT(*) as login_count
     FROM audit_logs
     WHERE org_id = $1 
       AND action IN ('auth.login', 'client_login_success')
       AND meta->>'client_id' IS NOT NULL
       AND created_at > NOW() - INTERVAL '30 days'
     GROUP BY meta->>'client_id'`,
    [orgId]
  );

  // Count direct logins (without client_id) - these are logins to your main app
  const directLoginsResult = await query(
    `SELECT COUNT(*) as login_count
     FROM audit_logs
     WHERE org_id = $1 
       AND action IN ('auth.login', 'client_login_success')
       AND (meta->>'client_id' IS NULL OR meta IS NULL)
       AND created_at > NOW() - INTERVAL '30 days'`,
    [orgId]
  );

  const loginCounts = new Map(
    loginsResult.rows.map((r) => [r.client_id, parseInt(r.login_count) || 0])
  );

  const directLogins = parseInt(directLoginsResult.rows[0]?.login_count) || 0;

  // Create array with clients + direct logins
  const clientsWithLogins = result.rows.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    createdAt: row.created_at,
    activeTokens: parseInt(row.active_sessions) || 0,
    totalTokens: parseInt(row.total_sessions) || 0,
    logins30d: loginCounts.get(row.client_id) || 0,
  }));

  // Add direct logins as a pseudo-client if there are any
  if (directLogins > 0) {
    clientsWithLogins.unshift({
      id: "direct",
      clientId: "direct",
      name: "Direct Login (Dashboard)",
      createdAt: new Date().toISOString(),
      activeTokens: 0,
      totalTokens: 0,
      logins30d: directLogins,
    });
  }

  return {
    clients: clientsWithLogins,
    totalClients: result.rows.length,
  };
}

/**
 * Security & Risk Analytics
 */
export async function getSecurityStats(orgId: string) {
  // Try cache first
  const cached = await analyticsCache.get<
    ReturnType<typeof getSecurityStatsFromDb>
  >("security", orgId);
  if (cached) return cached;

  const result = await getSecurityStatsFromDb(orgId);
  await analyticsCache.set("security", orgId, result);
  return result;
}

async function getSecurityStatsFromDb(orgId: string) {
  // Risk events
  const riskResult = await query(
    `SELECT 
      COUNT(*) FILTER (WHERE risk_score > 0.7) as high_risk,
      COUNT(*) FILTER (WHERE risk_score > 0.3 AND risk_score <= 0.7) as medium_risk,
      COUNT(*) FILTER (WHERE risk_score <= 0.3) as low_risk,
      COUNT(*) FILTER (WHERE decision = 'blocked') as blocked
     FROM risk_events r
     JOIN users u ON r.user_id = u.id
     WHERE u.org_id = $1 AND r.created_at > NOW() - INTERVAL '30 days'`,
    [orgId]
  );

  // Failed logins
  const failedResult = await query(
    `SELECT 
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as failed_24h,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as failed_7d
     FROM audit_logs
     WHERE org_id = $1 
       AND action IN ('login_failed', 'login.failed')`,
    [orgId]
  );

  // MFA bypass attempts (if tracked)
  const mfaResult = await query(
    `SELECT COUNT(*) as mfa_failures
     FROM audit_logs
     WHERE org_id = $1 
       AND action IN ('mfa.failed', 'mfa_failed')
       AND created_at > NOW() - INTERVAL '30 days'`,
    [orgId]
  );

  const risk = riskResult.rows[0];
  const failed = failedResult.rows[0];
  const mfa = mfaResult.rows[0];

  return {
    riskEvents: {
      high: parseInt(risk?.high_risk) || 0,
      medium: parseInt(risk?.medium_risk) || 0,
      low: parseInt(risk?.low_risk) || 0,
      blocked: parseInt(risk?.blocked) || 0,
    },
    failedLogins: {
      last24h: parseInt(failed?.failed_24h) || 0,
      last7d: parseInt(failed?.failed_7d) || 0,
    },
    mfaFailures: parseInt(mfa?.mfa_failures) || 0,
  };
}

/**
 * Combined overview for dashboard
 */
export async function getOverview(orgId: string) {
  const [users, sessions, security] = await Promise.all([
    getUserStats(orgId),
    getSessionStats(orgId),
    getSecurityStats(orgId),
  ]);

  return { users, sessions, security };
}
