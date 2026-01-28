/**
 * Rate Limit Cache
 *
 * Redis-based rate limiting using atomic counters.
 * Key format: rate:{ip}:{endpoint}
 */
import {
  getRedis,
  getKey,
  safeRedisOp,
  isRedisConnected,
} from "../config/redis.js";

const RATE_PREFIX = "rate:";

interface RateLimitResult {
  allowed: boolean;
  current: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Increment rate limit counter and check if allowed
 * Uses Redis MULTI for atomic operations
 */
export async function increment(
  identifier: string, // e.g., IP address
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const defaultResult: RateLimitResult = {
    allowed: true,
    current: 0,
    remaining: maxRequests,
    resetAt: new Date(Date.now() + windowSeconds * 1000),
  };

  const result = await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return defaultResult;

    const key = getKey(`${RATE_PREFIX}${identifier}:${endpoint}`);

    // Get current count
    const currentStr = await redis.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;

    if (current >= maxRequests) {
      const ttl = await redis.ttl(key);
      return {
        allowed: false,
        current,
        remaining: 0,
        resetAt: new Date(Date.now() + ttl * 1000),
      };
    }

    // Increment counter
    const newCount = await redis.incr(key);

    // Set expiry on first request
    if (newCount === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);

    return {
      allowed: true,
      current: newCount,
      remaining: Math.max(0, maxRequests - newCount),
      resetAt: new Date(Date.now() + ttl * 1000),
    };
  });

  return result ?? defaultResult;
}

/**
 * Check if rate limited without incrementing
 */
export async function isLimited(
  identifier: string,
  endpoint: string,
  maxRequests: number
): Promise<boolean> {
  const result = await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return false;

    const key = getKey(`${RATE_PREFIX}${identifier}:${endpoint}`);
    const currentStr = await redis.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;

    return current >= maxRequests;
  });

  return result ?? false;
}

/**
 * Reset rate limit for an identifier/endpoint
 */
export async function reset(
  identifier: string,
  endpoint: string
): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    await redis.del(getKey(`${RATE_PREFIX}${identifier}:${endpoint}`));
  });
}

/**
 * Get current rate limit status
 */
export async function getStatus(
  identifier: string,
  endpoint: string,
  maxRequests: number
): Promise<{ current: number; remaining: number; resetIn: number }> {
  const result = await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) {
      return { current: 0, remaining: maxRequests, resetIn: 0 };
    }

    const key = getKey(`${RATE_PREFIX}${identifier}:${endpoint}`);
    const currentStr = await redis.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    const ttl = await redis.ttl(key);

    return {
      current,
      remaining: Math.max(0, maxRequests - current),
      resetIn: Math.max(0, ttl),
    };
  });

  return result ?? { current: 0, remaining: maxRequests, resetIn: 0 };
}

/**
 * Check if caching is available
 */
export function isAvailable(): boolean {
  return isRedisConnected();
}
