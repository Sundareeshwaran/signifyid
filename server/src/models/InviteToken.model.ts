/**
 * Invite Token Model
 *
 * Manages secure, single-use invite tokens for user invitations
 */
import crypto from "crypto";
import { query } from "../config/db.js";

interface InviteToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

interface InviteTokenWithUser extends InviteToken {
  email: string;
  display_name: string;
  org_id: string;
  status: string;
}

/**
 * Generate a cryptographically secure token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a new invite token for a user
 * Deletes any existing tokens for the user first
 */
export async function create(userId: string): Promise<InviteToken> {
  // Delete any existing tokens for this user
  await deleteForUser(userId);

  const token = generateToken();

  const result = await query<InviteToken>(
    `INSERT INTO invite_tokens (user_id, token)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, token]
  );

  return result.rows[0];
}

/**
 * Find a token by its value with user details
 * Returns null if token doesn't exist, is expired, or already used
 */
export async function findValidToken(
  token: string
): Promise<InviteTokenWithUser | null> {
  const result = await query<InviteTokenWithUser>(
    `SELECT t.*, u.email, u.display_name, u.org_id, u.status
     FROM invite_tokens t
     JOIN users u ON t.user_id = u.id
     WHERE t.token = $1 
       AND t.expires_at > NOW() 
       AND t.used_at IS NULL`,
    [token]
  );

  return result.rows[0] || null;
}

/**
 * Mark a token as used
 */
export async function markUsed(tokenId: string): Promise<void> {
  await query(`UPDATE invite_tokens SET used_at = NOW() WHERE id = $1`, [
    tokenId,
  ]);
}

/**
 * Delete all tokens for a user (for re-invite scenarios)
 */
export async function deleteForUser(userId: string): Promise<void> {
  await query(`DELETE FROM invite_tokens WHERE user_id = $1`, [userId]);
}

/**
 * Get token by user ID (for resend scenarios)
 */
export async function findByUserId(
  userId: string
): Promise<InviteToken | null> {
  const result = await query<InviteToken>(
    `SELECT * FROM invite_tokens 
     WHERE user_id = $1 
       AND expires_at > NOW() 
       AND used_at IS NULL`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Cleanup expired tokens (can be run periodically)
 */
export async function cleanupExpired(): Promise<number> {
  const result = await query(
    `DELETE FROM invite_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL`
  );
  return result.rowCount || 0;
}
