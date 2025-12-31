/**
 * MFA Model
 *
 * Data access layer for MFA methods
 */
import * as otplib from "otplib";
import { query } from "../config/db.js";

const authenticator = otplib.authenticator;

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate a TOTP URI for QR code
 */
export function generateTotpUri(
  secret: string,
  email: string,
  issuer: string = "Signify iD"
): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Verify a TOTP code
 */
export function verifyTotp(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

/**
 * Create a new MFA method for a user
 */
export async function create(
  userId: string,
  type: "totp" | "webauthn",
  secret: string
): Promise<{ id: string }> {
  const result = await query<{ id: string }>(
    `INSERT INTO mfa_methods (user_id, type, secret, verified)
     VALUES ($1, $2, $3, FALSE)
     RETURNING id`,
    [userId, type, secret]
  );
  return result.rows[0];
}

/**
 * Get all MFA methods for a user
 */
export async function getByUserId(userId: string) {
  const result = await query(
    `SELECT id, type, verified, created_at
     FROM mfa_methods
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows;
}

/**
 * Get a specific MFA method with secret (for verification)
 */
export async function getWithSecret(userId: string, type: "totp" | "webauthn") {
  const result = await query(
    `SELECT id, type, secret, verified
     FROM mfa_methods
     WHERE user_id = $1 AND type = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, type]
  );
  return result.rows[0] || null;
}

/**
 * Mark an MFA method as verified (enabled)
 */
export async function setVerified(id: string): Promise<void> {
  await query(`UPDATE mfa_methods SET verified = TRUE WHERE id = $1`, [id]);
}

/**
 * Check if user has MFA enabled (any verified method)
 */
export async function hasVerifiedMfa(userId: string): Promise<boolean> {
  const result = await query(
    `SELECT id FROM mfa_methods
     WHERE user_id = $1 AND verified = TRUE
     LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0;
}

/**
 * Delete an MFA method
 */
export async function remove(id: string, userId: string): Promise<void> {
  await query(`DELETE FROM mfa_methods WHERE id = $1 AND user_id = $2`, [
    id,
    userId,
  ]);
}

/**
 * Delete all MFA methods for a user
 */
export async function removeAll(userId: string): Promise<void> {
  await query(`DELETE FROM mfa_methods WHERE user_id = $1`, [userId]);
}
