/**
 * Session Cache
 *
 * Caches user session data in Redis to reduce PostgreSQL load.
 * Key format: session:user:{session_id}
 */
import {
  getRedis,
  getKey,
  safeRedisOp,
  isRedisConnected,
} from "../config/redis.js";
import type { SessionRow } from "../models/Session.model.js";

const SESSION_PREFIX = "session:user:";

/**
 * Get cached session by session ID
 */
export async function get(sessionId: string): Promise<SessionRow | null> {
  return safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return null;

    const data = await redis.get(getKey(`${SESSION_PREFIX}${sessionId}`));
    if (!data) return null;

    const session = JSON.parse(data) as SessionRow;

    // Validate expiry (double-check even though Redis TTL should handle it)
    if (new Date(session.expires_at) <= new Date()) {
      await invalidate(sessionId);
      return null;
    }

    return session;
  });
}

/**
 * Cache a session
 * TTL is calculated from session expiry time
 */
export async function set(
  sessionId: string,
  session: SessionRow,
): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    // Calculate TTL in seconds from session expiry
    const expiresAt = new Date(session.expires_at);
    const ttlMs = expiresAt.getTime() - Date.now();
    const ttlSeconds = Math.max(Math.floor(ttlMs / 1000), 1);

    await redis.setEx(
      getKey(`${SESSION_PREFIX}${sessionId}`),
      ttlSeconds,
      JSON.stringify(session),
    );
  });
}

/**
 * Invalidate a cached session
 */
export async function invalidate(sessionId: string): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    await redis.del(getKey(`${SESSION_PREFIX}${sessionId}`));
  });
}

/**
 * Invalidate all sessions for a user
 * Uses pattern matching to find and delete all user sessions
 */
export async function invalidateAllForUser(userId: string): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    // Note: This requires scanning keys which can be slow.
    // For production, consider maintaining a user->sessions index
    const pattern = getKey(`${SESSION_PREFIX}*`);
    const keys = await redis.keys(pattern);

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const session = JSON.parse(data) as SessionRow;
        if (session.user_id === userId) {
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
