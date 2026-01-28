/**
 * OTP Cache
 *
 * Stores OTP codes in Redis with automatic expiry.
 * Key format: otp:{identifier}
 */
import {
  getRedis,
  getKey,
  safeRedisOp,
  isRedisConnected,
} from "../config/redis.js";

const OTP_PREFIX = "otp:";
const DEFAULT_TTL_SECONDS = 300; // 5 minutes

interface StoredOTP {
  code: string;
  attempts: number;
  createdAt: string;
}

/**
 * Store an OTP code
 */
export async function store(
  identifier: string, // user_id or email
  code: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<boolean> {
  const result = await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return false;

    const data: StoredOTP = {
      code,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    await redis.setex(
      getKey(`${OTP_PREFIX}${identifier}`),
      ttlSeconds,
      JSON.stringify(data),
    );

    return true;
  });

  return result ?? false;
}

/**
 * Verify an OTP code
 * Returns true if valid, false otherwise
 * Deletes the OTP after successful verification
 */
export async function verify(
  identifier: string,
  code: string,
  maxAttempts: number = 5,
): Promise<{ valid: boolean; error?: string }> {
  const result = await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return { valid: false, error: "cache_unavailable" };

    const key = getKey(`${OTP_PREFIX}${identifier}`);
    const data = await redis.get(key);

    if (!data) {
      return { valid: false, error: "otp_not_found" };
    }

    const stored = JSON.parse(data) as StoredOTP;

    // Check max attempts
    if (stored.attempts >= maxAttempts) {
      await redis.del(key);
      return { valid: false, error: "max_attempts_exceeded" };
    }

    // Increment attempts
    stored.attempts++;
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      await redis.setex(key, ttl, JSON.stringify(stored));
    }

    // Verify code
    if (stored.code !== code) {
      return { valid: false, error: "invalid_code" };
    }

    // Valid - delete the OTP
    await redis.del(key);
    return { valid: true };
  });

  return result ?? { valid: false, error: "cache_unavailable" };
}

/**
 * Delete an OTP (e.g., after user requests new one)
 */
export async function remove(identifier: string): Promise<void> {
  await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return;

    await redis.del(getKey(`${OTP_PREFIX}${identifier}`));
  });
}

/**
 * Check if an OTP exists for an identifier
 */
export async function exists(identifier: string): Promise<boolean> {
  const result = await safeRedisOp(async () => {
    const redis = getRedis();
    if (!redis) return false;

    const exists = await redis.exists(getKey(`${OTP_PREFIX}${identifier}`));
    return exists === 1;
  });

  return result ?? false;
}

/**
 * Check if caching is available
 */
export function isAvailable(): boolean {
  return isRedisConnected();
}
