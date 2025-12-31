/**
 * Analytics Cache
 *
 * Caches expensive analytics query results.
 * Key format: analytics:{type}:{org_id}
 */
import {
  getRedis,
  getKey,
  safeRedisOp,
  isRedisConnected,
} from "../config/redis.js";

const ANALYTICS_PREFIX = "analytics:";

// Default TTLs for different analytics types
const TTL_CONFIG = {
  security: 60, // 60 seconds
  overview: 30, // 30 seconds
  loginTrends: 60, // 60 seconds
  userStats: 60, // 60 seconds
  sessions: 30, // 30 seconds
  clients: 60, // 60 seconds
} as const;

type AnalyticsType = keyof typeof TTL_CONFIG;

/**
 * Get cached analytics data
 */
export async function get<T>(
  type: AnalyticsType,
  orgId: string
): Promise<T | null> {
  return safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return null;

    const key = getKey(`${ANALYTICS_PREFIX}${type}:${orgId}`);
    const data = await redis.get(key);

    if (!data) return null;

    return JSON.parse(data) as T;
  });
}

/**
 * Cache analytics data
 */
export async function set<T>(
  type: AnalyticsType,
  orgId: string,
  data: T,
  ttlSeconds?: number
): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    const ttl = ttlSeconds ?? TTL_CONFIG[type];
    const key = getKey(`${ANALYTICS_PREFIX}${type}:${orgId}`);

    await redis.setEx(key, ttl, JSON.stringify(data));
  });
}

/**
 * Invalidate specific analytics cache
 */
export async function invalidate(
  type: AnalyticsType,
  orgId: string
): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    await redis.del(getKey(`${ANALYTICS_PREFIX}${type}:${orgId}`));
  });
}

/**
 * Invalidate all analytics cache for an organization
 */
export async function invalidateAllForOrg(orgId: string): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    const pattern = getKey(`${ANALYTICS_PREFIX}*:${orgId}`);
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(keys);
    }
  });
}

/**
 * Get or set analytics data (cache-aside pattern)
 * Fetches from cache, or executes fetcher and caches result
 */
export async function getOrSet<T>(
  type: AnalyticsType,
  orgId: string,
  fetcher: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  // Try cache first
  const cached = await get<T>(type, orgId);
  if (cached !== null) {
    return cached;
  }

  // Fetch from source
  const data = await fetcher();

  // Cache result (don't await, fire and forget)
  set(type, orgId, data, ttlSeconds);

  return data;
}

/**
 * Check if caching is available
 */
export function isAvailable(): boolean {
  return isRedisConnected();
}
