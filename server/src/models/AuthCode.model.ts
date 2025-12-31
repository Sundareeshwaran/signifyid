/**
 * Authorization Code Model
 * 
 * Data access layer for OAuth2 authorization codes
 */
import crypto from 'crypto';
import { query } from '../config/db.js';

/**
 * Generate a cryptographically secure authorization code
 */
export function generateCode(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Create and store a new authorization code
 */
export async function create(data: {
  clientId: string;  // Internal UUID
  userId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge?: string;
  codeChallengeMethod?: string;
  nonce?: string;
}): Promise<string> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await query(
    `INSERT INTO authorization_codes 
     (code, client_id, user_id, redirect_uri, scopes, code_challenge, code_challenge_method, nonce, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      code,
      data.clientId,
      data.userId,
      data.redirectUri,
      data.scopes,
      data.codeChallenge || null,
      data.codeChallengeMethod || null,
      data.nonce || null,
      expiresAt,
    ]
  );

  return code;
}

/**
 * Find a valid (unexpired, unused) authorization code
 */
export async function findValid(code: string) {
  const result = await query(
    `SELECT 
      ac.code, ac.client_id, ac.user_id, ac.redirect_uri, ac.scopes,
      ac.code_challenge, ac.code_challenge_method, ac.nonce,
      c.client_id as public_client_id, c.org_id
     FROM authorization_codes ac
     JOIN clients c ON ac.client_id = c.id
     WHERE ac.code = $1 
       AND ac.used = FALSE 
       AND ac.expires_at > NOW()`,
    [code]
  );
  return result.rows[0] || null;
}

/**
 * Mark an authorization code as used (consumed)
 */
export async function consume(code: string): Promise<void> {
  await query(
    `UPDATE authorization_codes SET used = TRUE WHERE code = $1`,
    [code]
  );
}

/**
 * Clean up expired authorization codes
 */
export async function cleanupExpired(): Promise<number> {
  const result = await query(
    `DELETE FROM authorization_codes WHERE expires_at < NOW() OR used = TRUE`
  );
  return result.rowCount || 0;
}

/**
 * Verify PKCE code verifier against code challenge
 */
export function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string,
  method: string
): boolean {
  if (method === 'plain') {
    return codeVerifier === codeChallenge;
  }
  
  if (method === 'S256') {
    const hash = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return hash === codeChallenge;
  }
  
  return false;
}
