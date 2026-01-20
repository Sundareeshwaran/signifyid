/**
 * Token Model
 * 
 * Data access layer for refresh token operations
 */
import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * Hash a refresh token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Save a refresh token
 */
export async function save(
  userId: string,
  refreshToken: string,
  expiresAt: Date
): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  
  // Revoke old tokens first
  await query(
    `UPDATE tokens SET revoked = TRUE WHERE user_id = $1`,
    [userId]
  );
  
  // Insert new token
  await query(
    `INSERT INTO tokens (user_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

/**
 * Check if a refresh token is valid
 */
export async function isValid(userId: string, refreshToken: string): Promise<boolean> {
  const tokenHash = hashToken(refreshToken);
  const result = await query(
    `SELECT id FROM tokens 
     WHERE user_id = $1 
       AND refresh_token_hash = $2 
       AND revoked = FALSE 
       AND expires_at > NOW()`,
    [userId, tokenHash]
  );
  return result.rows.length > 0;
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAll(userId: string): Promise<void> {
  await query(
    `UPDATE tokens SET revoked = TRUE WHERE user_id = $1`,
    [userId]
  );
}
