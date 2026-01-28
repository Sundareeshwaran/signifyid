/**
 * RBAC Cache
 *
 * Caches user permissions in Redis to avoid repeated DB lookups.
 * Key format: rbac:{user_id}
 */
import {
  getRedis,
  getKey,
  safeRedisOp,
  isRedisConnected,
} from "../config/redis.js";

const RBAC_PREFIX = "rbac:";
const DEFAULT_TTL_SECONDS = 600; // 10 minutes

interface CachedPermissions {
  roles: string[];
  permissions: string[];
  cachedAt: string;
}

/**
 * Get cached permissions for a user
 */
export async function getPermissions(
  userId: string,
): Promise<{ roles: string[]; permissions: string[] } | null> {
  return safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return null;

    const data = await redis.get(getKey(`${RBAC_PREFIX}${userId}`));
    if (!data) return null;

    const cached = JSON.parse(data) as CachedPermissions;
    return {
      roles: cached.roles,
      permissions: cached.permissions,
    };
  });
}

/**
 * Cache permissions for a user
 */
export async function setPermissions(
  userId: string,
  roles: string[],
  permissions: string[],
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    const data: CachedPermissions = {
      roles,
      permissions,
      cachedAt: new Date().toISOString(),
    };

    await redis.setex(
      getKey(`${RBAC_PREFIX}${userId}`),
      ttlSeconds,
      JSON.stringify(data),
    );
  });
}

/**
 * Invalidate cached permissions for a user
 * Call this when user roles are updated
 */
export async function invalidate(userId: string): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    await redis.del(getKey(`${RBAC_PREFIX}${userId}`));
  });
}

/**
 * Invalidate cached permissions for multiple users
 * Useful when a role's permissions are changed
 */
export async function invalidateMultiple(userIds: string[]): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis || userIds.length === 0) return;

    const keys = userIds.map((id) => getKey(`${RBAC_PREFIX}${id}`));
    await redis.del(keys);
  });
}

/**
 * Invalidate all RBAC cache entries for an organization
 * Call this when organization-wide role changes occur
 */
export async function invalidateAllForOrg(): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    const pattern = getKey(`${RBAC_PREFIX}*`);
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  });
}

/**
 * Check if caching is available
 */
export function isAvailable(): boolean {
  return isRedisConnected();
}
