/**
 * Client Session Cache
 *
 * Caches client session data in Redis to reduce PostgreSQL load.
 * Key format: session:client:{session_id}
 */
import {
  getRedis,
  getKey,
  safeRedisOp,
  isRedisConnected,
} from "../config/redis.js";
import type { ClientSession } from "../models/ClientSession.model.js";

const CLIENT_SESSION_PREFIX = "session:client:";

/**
 * Get cached client session by session ID
 */
export async function get(sessionId: string): Promise<ClientSession | null> {
  return safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return null;

    const data = await redis.get(
      getKey(`${CLIENT_SESSION_PREFIX}${sessionId}`)
    );
    if (!data) return null;

    const session = JSON.parse(data) as ClientSession;

    // Validate expiry
    if (new Date(session.expires_at) <= new Date()) {
      await invalidate(sessionId);
      return null;
    }

    // Check if revoked
    if (session.revoked) {
      await invalidate(sessionId);
      return null;
    }

    return session;
  });
}

/**
 * Cache a client session
 * TTL is calculated from session expiry time
 */
export async function set(
  sessionId: string,
  session: ClientSession
): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    // Calculate TTL in seconds from session expiry
    const expiresAt = new Date(session.expires_at);
    const ttlMs = expiresAt.getTime() - Date.now();
    const ttlSeconds = Math.max(Math.floor(ttlMs / 1000), 1);

    await redis.setEx(
      getKey(`${CLIENT_SESSION_PREFIX}${sessionId}`),
      ttlSeconds,
      JSON.stringify(session)
    );
  });
}

/**
 * Invalidate a cached client session
 */
export async function invalidate(sessionId: string): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    await redis.del(getKey(`${CLIENT_SESSION_PREFIX}${sessionId}`));
  });
}

/**
 * Invalidate all sessions for a client
 */
export async function invalidateAllForClient(clientId: string): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    const pattern = getKey(`${CLIENT_SESSION_PREFIX}*`);
    const keys = await redis.keys(pattern);

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const session = JSON.parse(data) as ClientSession;
        if (session.client_id === clientId) {
          await redis.del(key);
        }
      }
    }
  });
}

/**
 * Check if caching is available
 */
export function isAvailable(): boolean {
  return isRedisConnected();
}
