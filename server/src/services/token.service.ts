/**
 * JWT Token Service
 *
 * Handles access and refresh token generation/verification
 */
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { config } from "../config/env.js";
import { query } from "../config/db.js";
import type { JwtPayload, User } from "../types/index.js";

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(
  payload: Omit<JwtPayload, "type" | "iat" | "exp">
): string {
  return jwt.sign({ ...payload, type: "access" }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpires as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(
  payload: Omit<JwtPayload, "type" | "iat" | "exp">
): string {
  return jwt.sign({ ...payload, type: "refresh" }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    if (decoded.type !== "access") return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
    if (decoded.type !== "refresh") return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Store refresh token in database
 */
export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
  clientId?: string
): Promise<void> {
  const tokenHash = await argon2.hash(refreshToken);
  const expiresAt = new Date(Date.now() + config.cookie.refreshExpires);

  await query(
    `INSERT INTO tokens (user_id, client_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, clientId || null, tokenHash, expiresAt]
  );
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(userId: string): Promise<void> {
  await query(
    `UPDATE tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE`,
    [userId]
  );
}

/**
 * Check if refresh token is valid (not revoked)
 */
export async function isRefreshTokenValid(
  userId: string,
  refreshToken: string
): Promise<boolean> {
  const result = await query(
    `SELECT refresh_token_hash FROM tokens 
     WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()
     ORDER BY issued_at DESC LIMIT 5`,
    [userId]
  );

  for (const row of result.rows) {
    try {
      if (await argon2.verify(row.refresh_token_hash, refreshToken)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

/**
 * Generate both tokens and store refresh token
 */
export async function generateTokenPair(
  user: Pick<User, "id" | "org_id" | "email" | "display_name">,
  sessionId: string,
  roles: string[],
  permissions: string[],
  clientId?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = {
    sub: user.id,
    sessionId,
    org_id: user.org_id,
    email: user.email,
    display_name: user.display_name,
    roles,
    permissions,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await storeRefreshToken(user.id, refreshToken, clientId);

  return { accessToken, refreshToken };
}
