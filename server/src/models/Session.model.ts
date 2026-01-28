/**
 * Session Model
 *
 * Data access layer for session operations.
 * Sessions track authenticated contexts across devices and clients.
 */
import { query } from "../config/db.js";
import { logger } from "../config/logger.js";

export interface SessionRow {
  id: string;
  user_id: string;
  org_id: string;
  client_id: string | null;
  device_info: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  mfa_verified: boolean;
  created_at: Date;
  last_activity_at: Date;
  expires_at: Date;
  revoked: boolean;
}

export interface CreateSessionInput {
  userId: string;
  orgId: string;
  clientId?: string;
  deviceInfo?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  mfaVerified: boolean;
  expiresAt: Date;
}

/**
 * Create a new session
 */
export async function create(input: CreateSessionInput): Promise<SessionRow> {
  const result = await query<SessionRow>(
    `INSERT INTO sessions (user_id, org_id, client_id, device_info, ip_address, user_agent, mfa_verified, expires_at, last_activity_at, revoked)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), FALSE)
     RETURNING *`,
    [
      input.userId,
      input.orgId,
      input.clientId || null,
      input.deviceInfo || null,
      input.ipAddress || null,
      input.userAgent || null,
      input.mfaVerified,
      input.expiresAt,
    ]
  );
  return result.rows[0];
}

/**
 * Find session by ID
 */
export async function findById(sessionId: string): Promise<SessionRow | null> {
  const result = await query<SessionRow>(
    `SELECT * FROM sessions WHERE id = $1`,
    [sessionId]
  );
  return result.rows[0] || null;
}

/**
 * Find session by ID within an organization
 */
export async function findByIdInOrg(
  sessionId: string,
  orgId: string
): Promise<SessionRow | null> {
  const result = await query<SessionRow>(
    `SELECT * FROM sessions WHERE id = $1 AND org_id = $2`,
    [sessionId, orgId]
  );
  return result.rows[0] || null;
}

/**
 * List sessions for an organization with pagination
 */
export async function listByOrg(
  orgId: string,
  options: { page?: number; limit?: number; includeRevoked?: boolean } = {}
): Promise<{ sessions: SessionRow[]; total: number }> {
  const { page = 1, limit = 50, includeRevoked = false } = options;
  const offset = (page - 1) * limit;

  const whereClause = includeRevoked
    ? "WHERE s.org_id = $1"
    : "WHERE s.org_id = $1 AND (s.revoked = FALSE OR s.revoked IS NULL) AND s.expires_at > NOW()";

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM sessions s ${whereClause}`,
    [orgId]
  );
  const total = parseInt(countResult.rows[0]?.total || "0");

  // Get paginated sessions with user info
  const result = await query<
    SessionRow & { user_email: string; user_name: string }
  >(
    `SELECT 
      s.*,
      u.email as user_email,
      u.display_name as user_name
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     ${whereClause}
     ORDER BY s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [orgId, limit, offset]
  );

  return { sessions: result.rows, total };
}

/**
 * List sessions for a specific user with optional pagination
 */
export async function listByUser(
  userId: string,
  orgId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{
  sessions: (SessionRow & { user_email?: string; user_name?: string })[];
  total: number;
}> {
  const { page, limit } = options;

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM sessions 
     WHERE user_id = $1 AND org_id = $2 AND (revoked = FALSE OR revoked IS NULL) AND expires_at > NOW()`,
    [userId, orgId]
  );
  const total = parseInt(countResult.rows[0]?.total || "0");

  // Build query with optional pagination
  let sql = `SELECT 
      s.*,
      u.email as user_email,
      u.display_name as user_name
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.user_id = $1 AND s.org_id = $2 AND (s.revoked = FALSE OR s.revoked IS NULL) AND s.expires_at > NOW()
     ORDER BY s.created_at DESC`;

  const params: any[] = [userId, orgId];

  if (page !== undefined && limit !== undefined) {
    const offset = (page - 1) * limit;
    sql += ` LIMIT $3 OFFSET $4`;
    params.push(limit, offset);
  }

  const result = await query<
    SessionRow & { user_email: string; user_name: string }
  >(sql, params);

  logger.debug(
    `SessionModel.listByUser query result: reqUser=${userId} org=${orgId} found=${result.rows.length} total=${total}`
  );

  return { sessions: result.rows, total };
}

/**
 * Validate session (check if valid for authentication)
 * Returns null if invalid, session if valid
 */
export async function validate(sessionId: string): Promise<SessionRow | null> {
  const result = await query<SessionRow>(
    `SELECT * FROM sessions 
     WHERE id = $1 
       AND (revoked = FALSE OR revoked IS NULL) 
       AND expires_at > NOW()`,
    [sessionId]
  );

  const session = result.rows[0];
  if (!session) return null;

  return session;
}

/**
 * Check if session is valid and MFA verified
 */
export async function validateWithMfa(
  sessionId: string
): Promise<{ valid: boolean; session: SessionRow | null; error?: string }> {
  const session = await validate(sessionId);

  if (!session) {
    return {
      valid: false,
      session: null,
      error: "Session not found or expired",
    };
  }

  if (!session.mfa_verified) {
    return { valid: false, session, error: "MFA verification required" };
  }

  return { valid: true, session };
}

/**
 * Revoke a single session
 */
export async function revoke(
  sessionId: string,
  orgId: string
): Promise<boolean> {
  const result = await query(
    `UPDATE sessions SET revoked = TRUE 
     WHERE id = $1 AND org_id = $2 AND revoked = FALSE`,
    [sessionId, orgId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllForUser(userId: string): Promise<number> {
  const result = await query(
    `UPDATE sessions SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE`,
    [userId]
  );
  return result.rowCount ?? 0;
}

/**
 * Revoke all sessions for a user in an organization
 */
export async function revokeAllForUserInOrg(
  userId: string,
  orgId: string
): Promise<number> {
  const result = await query(
    `UPDATE sessions SET revoked = TRUE 
     WHERE user_id = $1 AND org_id = $2 AND revoked = FALSE`,
    [userId, orgId]
  );
  return result.rowCount ?? 0;
}

/**
 * Update MFA verified status for a session
 */
export async function updateMfaVerified(
  sessionId: string,
  mfaVerified: boolean
): Promise<boolean> {
  const result = await query(
    `UPDATE sessions SET mfa_verified = $1 WHERE id = $2`,
    [mfaVerified, sessionId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Cleanup expired sessions (for scheduled job)
 */
export async function cleanupExpired(): Promise<number> {
  const result = await query(
    `DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '7 days'`,
    []
  );
  return result.rowCount ?? 0;
}

/**
 * Get session count for user
 */
export async function getActiveCountForUser(userId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM sessions 
     WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()`,
    [userId]
  );
  return parseInt(result.rows[0]?.count || "0");
}

/**
 * Update session last activity timestamp
 */
export async function updateLastActivity(sessionId: string): Promise<boolean> {
  const result = await query(
    `UPDATE sessions SET last_activity_at = NOW() WHERE id = $1`,
    [sessionId]
  );
  return (result.rowCount ?? 0) > 0;
}
