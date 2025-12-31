/**
 * WebAuthn Challenge Cache
 *
 * Redis-backed challenge store for WebAuthn registration and authentication.
 * Provides graceful fallback to in-memory storage for single-instance deployments.
 *
 * Key format: webauthn:challenge:{type}:{identifier}
 */
import {
  getRedis,
  getKey,
  safeRedisOp,
  isRedisConnected,
} from "../config/redis.js";

const CHALLENGE_PREFIX = "webauthn:challenge:";
const DEFAULT_TTL_SECONDS = 300; // 5 minutes

/**
 * In-memory fallback store for when Redis is unavailable
 * WARNING: Only suitable for single-instance deployments
 */
const memoryFallback = new Map<
  string,
  { challenge: string; expires: number }
>();

/**
 * Clean up expired entries from memory fallback (prevent memory leaks)
 */
function cleanupMemory(): void {
  const now = Date.now();
  for (const [key, value] of memoryFallback.entries()) {
    if (value.expires < now) {
      memoryFallback.delete(key);
    }
  }
}

// Run cleanup every 60 seconds
setInterval(cleanupMemory, 60_000);

/**
 * Store a WebAuthn challenge
 *
 * @param key - Unique key (e.g., "reg:userId" or "auth:email")
 * @param challenge - The challenge string to store
 * @param ttlSeconds - Time to live in seconds (default: 5 minutes)
 */
export async function store(
  key: string,
  challenge: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  const fullKey = `${CHALLENGE_PREFIX}${key}`;

  const stored = await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return false;

    await redis.setEx(getKey(fullKey), ttlSeconds, challenge);
    return true;
  });

  // Fallback to memory if Redis unavailable
  if (!stored) {
    memoryFallback.set(fullKey, {
      challenge,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }
}

/**
 * Get a stored WebAuthn challenge
 *
 * @param key - The key used when storing
 * @returns The challenge string, or null if not found/expired
 */
export async function get(key: string): Promise<string | null> {
  const fullKey = `${CHALLENGE_PREFIX}${key}`;

  const redisResult = await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return null;

    return redis.get(getKey(fullKey));
  });

  // If Redis returned a value, use it
  if (redisResult !== null) {
    return redisResult;
  }

  // Fallback to memory
  const memoryEntry = memoryFallback.get(fullKey);
  if (!memoryEntry) return null;

  // Check if expired
  if (memoryEntry.expires < Date.now()) {
    memoryFallback.delete(fullKey);
    return null;
  }

  return memoryEntry.challenge;
}

/**
 * Clear a stored WebAuthn challenge
 * Should be called after successful verification to prevent replay attacks
 *
 * @param key - The key used when storing
 */
export async function clear(key: string): Promise<void> {
  const fullKey = `${CHALLENGE_PREFIX}${key}`;

  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    await redis.del(getKey(fullKey));
  });

  // Also clear from memory fallback
  memoryFallback.delete(fullKey);
}

/**
 * Check if the challenge cache is using Redis (production-ready)
 * or falling back to in-memory (single-instance only)
 */
export function isUsingRedis(): boolean {
  return isRedisConnected();
}
