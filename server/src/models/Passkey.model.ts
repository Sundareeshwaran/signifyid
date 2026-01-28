/**
 * Passkey Model
 *
 * Database operations for WebAuthn passkey credentials
 */
import { query } from "../config/db.js";

export interface PasskeyCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: bigint;
  transports: string[];
  device_name: string | null;
  authenticator_aaguid: string | null;
  backed_up: boolean;
  created_at: Date;
  last_used_at: Date | null;
}

export interface CreatePasskeyInput {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
  deviceName?: string;
  authenticatorAAGUID?: string;
  backedUp?: boolean;
}

/**
 * Create a new passkey credential
 */
export async function create(
  input: CreatePasskeyInput
): Promise<PasskeyCredential> {
  const result = await query(
    `INSERT INTO passkey_credentials (
      user_id, credential_id, public_key, counter, transports, 
      device_name, authenticator_aaguid, backed_up
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      input.userId,
      input.credentialId,
      input.publicKey,
      input.counter,
      input.transports,
      input.deviceName || null,
      input.authenticatorAAGUID || null,
      input.backedUp || false,
    ]
  );
  return result.rows[0] as PasskeyCredential;
}

/**
 * Find passkey by credential ID
 */
export async function findByCredentialId(
  credentialId: string
): Promise<PasskeyCredential | null> {
  const result = await query(
    `SELECT * FROM passkey_credentials WHERE credential_id = $1`,
    [credentialId]
  );
  return (result.rows[0] as PasskeyCredential) || null;
}

/**
 * Find all passkeys for a user
 */
export async function findByUserId(
  userId: string
): Promise<PasskeyCredential[]> {
  const result = await query(
    `SELECT * FROM passkey_credentials WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows as PasskeyCredential[];
}

/**
 * Find passkey by user email (for authentication)
 */
export async function findByUserEmail(
  email: string
): Promise<(PasskeyCredential & { user_email: string; org_id: string })[]> {
  const result = await query(
    `SELECT pc.*, u.email as user_email, u.org_id 
     FROM passkey_credentials pc
     JOIN users u ON pc.user_id = u.id
     WHERE u.email = $1`,
    [email]
  );
  return result.rows as (PasskeyCredential & {
    user_email: string;
    org_id: string;
  })[];
}

/**
 * Update signature counter after successful authentication
 */
export async function updateCounter(
  credentialId: string,
  newCounter: number
): Promise<void> {
  await query(
    `UPDATE passkey_credentials 
     SET counter = $1, last_used_at = NOW() 
     WHERE credential_id = $2`,
    [newCounter, credentialId]
  );
}

/**
 * Update device name
 */
export async function updateDeviceName(
  id: string,
  userId: string,
  deviceName: string
): Promise<void> {
  await query(
    `UPDATE passkey_credentials 
     SET device_name = $1 
     WHERE id = $2 AND user_id = $3`,
    [deviceName, id, userId]
  );
}

/**
 * Delete a passkey
 */
export async function deletePasskey(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await query(
    `DELETE FROM passkey_credentials WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Count passkeys for a user
 */
export async function countByUserId(userId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM passkey_credentials WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}

/**
 * Check if user has any passkeys
 */
export async function hasPasskeys(userId: string): Promise<boolean> {
  const count = await countByUserId(userId);
  return count > 0;
}
