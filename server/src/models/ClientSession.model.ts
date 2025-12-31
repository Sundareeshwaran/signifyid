/**
 * ClientSession Model
 *
 * Data access layer for client session operations
 * Manages session-based authentication for client sites
 */
import { v4 as uuidv4 } from "uuid";
import { randomBytes, createHash } from "crypto";
import argon2 from "argon2";
import { query } from "../config/db.js";

export interface ClientSession {
  id: string;
  client_id: string;
  org_id: string;
  session_token_hash: string;
  domain: string;
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  created_at: Date;
  last_activity_at: Date;
  expires_at: Date;
  revoked: boolean;
}

/**
 * Generate cryptographically secure session token
 */
export function generateSessionToken(): string {
  return `cs_${randomBytes(32).toString("hex")}`;
}

/**
 * Hash session token for storage
 */
export async function hashSessionToken(token: string): Promise<string> {
  return argon2.hash(token);
}

/**
 * Create a new client session
 */
export async function create(
  clientId: string,
  orgId: string,
  domain: string,
  ipAddress: string | null,
  userAgent: string | null,
  deviceFingerprint: string | null,
  ttlHours: number = 24
): Promise<{ session: ClientSession; sessionToken: string }> {
  const sessionToken = generateSessionToken();
  const tokenHash = await hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  const result = await query<ClientSession>(
    `INSERT INTO client_sessions 
      (client_id, org_id, session_token_hash, domain, ip_address, user_agent, device_fingerprint, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, client_id, org_id, session_token_hash, domain, ip_address, 
               user_agent, device_fingerprint, created_at, last_activity_at, expires_at, revoked`,
    [
      clientId,
      orgId,
      tokenHash,
      domain,
      ipAddress,
      userAgent,
      deviceFingerprint,
      expiresAt,
    ]
  );

  return {
    session: result.rows[0],
    sessionToken,
  };
}

/**
 * Find session by token hash (for validation)
 */
export async function findByToken(
  sessionToken: string
): Promise<ClientSession | null> {
  // Get all active sessions to check against
  const result = await query<ClientSession>(
    `SELECT id, client_id, org_id, session_token_hash, domain, ip_address, 
            user_agent, device_fingerprint, created_at, last_activity_at, expires_at, revoked
     FROM client_sessions
     WHERE revoked = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC`
  );

  // Verify token against each hash
  for (const row of result.rows) {
    try {
      const matches = await argon2.verify(row.session_token_hash, sessionToken);
      if (matches) {
        return row;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Validate session token
 * Returns session if valid, null if invalid/expired/revoked
 */
export async function validate(
  sessionToken: string
): Promise<ClientSession | null> {
  const session = await findByToken(sessionToken);

  if (!session) {
    return null;
  }

  // Check if expired
  if (new Date(session.expires_at) <= new Date()) {
    return null;
  }

  // Check if revoked
  if (session.revoked) {
    return null;
  }

  // Update last activity
  await query(
    `UPDATE client_sessions SET last_activity_at = NOW() WHERE id = $1`,
    [session.id]
  );

  return session;
}

/**
 * Revoke a specific session
 */
export async function revoke(sessionToken: string): Promise<boolean> {
  const session = await findByToken(sessionToken);
  if (!session) {
    return false;
  }

  await query(`UPDATE client_sessions SET revoked = TRUE WHERE id = $1`, [
    session.id,
  ]);

  return true;
}

/**
 * Revoke all sessions for a client
 */
export async function revokeAllForClient(clientId: string): Promise<number> {
  const result = await query(
    `UPDATE client_sessions SET revoked = TRUE 
     WHERE client_id = $1 AND revoked = FALSE
     RETURNING id`,
    [clientId]
  );

  return result.rowCount || 0;
}

/**
 * List active sessions for a client
 */
export async function listForClient(
  clientId: string
): Promise<ClientSession[]> {
  const result = await query<ClientSession>(
    `SELECT id, client_id, org_id, session_token_hash, domain, ip_address, 
            user_agent, device_fingerprint, created_at, last_activity_at, expires_at, revoked
     FROM client_sessions
     WHERE client_id = $1 AND revoked = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [clientId]
  );

  return result.rows;
}

/**
 * Cleanup expired sessions (for scheduled job)
 */
export async function cleanup(): Promise<number> {
  const result = await query(
    `DELETE FROM client_sessions 
     WHERE expires_at < NOW() - INTERVAL '7 days'
     RETURNING id`
  );

  return result.rowCount || 0;
}

/**
 * List active sessions for an organization (admin function)
 */
export async function listForOrg(orgId: string): Promise<ClientSession[]> {
  const result = await query<ClientSession>(
    `SELECT id, client_id, org_id, session_token_hash, domain, ip_address, 
            user_agent, device_fingerprint, created_at, last_activity_at, expires_at, revoked
     FROM client_sessions
     WHERE org_id = $1 AND revoked = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [orgId]
  );

  return result.rows;
}

/**
 * Get session by ID (for admin purposes)
 */
export async function findById(
  sessionId: string
): Promise<ClientSession | null> {
  const result = await query<ClientSession>(
    `SELECT id, client_id, org_id, session_token_hash, domain, ip_address, 
            user_agent, device_fingerprint, created_at, last_activity_at, expires_at, revoked
     FROM client_sessions
     WHERE id = $1`,
    [sessionId]
  );

  return result.rows[0] || null;
}

/**
 * Revoke session by ID (for admin purposes)
 */
export async function revokeById(sessionId: string): Promise<boolean> {
  const result = await query(
    `UPDATE client_sessions SET revoked = TRUE WHERE id = $1 RETURNING id`,
    [sessionId]
  );

  return result.rowCount === 1;
}
