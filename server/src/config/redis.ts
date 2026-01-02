/**
 * Redis Configuration
 *
 * Redis client singleton for caching layer.
 * Provides graceful fallback if Redis is unavailable.
 *
 * VERCEL SERVERLESS COMPATIBLE:
 * - Lazy initialization (connects on first use)
 * - Race condition protection for cold starts
 * - PING-based health validation
 * - Safe for multiple concurrent invocations
 */
import { createClient, RedisClientType } from "redis";
import { config } from "./env.js";
import { logger } from "./logger.js";

let redis: RedisClientType | null = null;
let isConnected = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize Redis client
 * Call this during app startup or lazily via ensureRedis()
 *
 * Serverless-safe: Multiple concurrent calls will share the same init promise
 */
export async function initRedis(): Promise<void> {
  // Already connected
  if (redis && isConnected) {
    return;
  }

  // Prevent multiple simultaneous init attempts (serverless race condition)
  if (initPromise) {
    return initPromise;
  }

  // Skip if no Redis URL configured
  if (!config.redis.url) {
    logger.warn("Redis URL not configured, caching disabled");
    return;
  }

  initPromise = (async () => {
    try {
      // Determine if TLS is required (rediss:// protocol)
      const useTls = config.redis.url.startsWith("rediss://");

      redis = createClient({
        url: config.redis.url,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              logger.error("Redis: Max reconnection attempts reached");
              return new Error("Max reconnection attempts reached");
            }
            // Exponential backoff: 100ms, 200ms, 400ms, etc.
            return Math.min(retries * 100, 3000);
          },
          connectTimeout: 5000,
          // TLS configuration for Redis Cloud and other hosted Redis services
          ...(useTls && {
            tls: true,
            // Allow self-signed certificates (required for some Redis Cloud setups)
            rejectUnauthorized: false,
          }),
        },
      });

      // Event handlers
      redis.on("error", (err: Error) => {
        logger.error("Redis error", { message: err.message, stack: err.stack });
        isConnected = false;
      });

      redis.on("connect", () => {
        logger.info("Redis connected");
        isConnected = true;
      });

      redis.on("reconnecting", () => {
        logger.info("Redis reconnecting...");
      });

      redis.on("end", () => {
        logger.warn("Redis connection closed");
        isConnected = false;
      });

      // Connect to Redis
      await redis.connect();
    } catch (error) {
      logger.error("Failed to connect to Redis", { error });
      redis = null;
      isConnected = false;
    } finally {
      // Reset init promise to allow retry after failure
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Ensure Redis is initialized (lazy initialization for serverless)
 * Safe to call multiple times - will connect only if not already connected
 */
export async function ensureRedis(): Promise<void> {
  if (!isRedisConnected()) {
    await initRedis();
  }
}

/**
 * Get Redis client
 * Returns null if Redis is not available
 */
export function getRedis(): RedisClientType | null {
  return redis;
}

/**
 * Check if Redis is connected and available
 */
export function isRedisConnected(): boolean {
  return isConnected && redis !== null;
}

/**
 * Get key with prefix
 */
export function getKey(key: string): string {
  return `${config.redis.keyPrefix}${key}`;
}

/**
 * Gracefully disconnect from Redis
 * Call this on app shutdown
 */
export async function disconnectRedis(): Promise<void> {
  if (redis && isConnected) {
    try {
      await redis.quit();
      logger.info("Redis disconnected gracefully");
    } catch (error) {
      // Only log if it's not a "client already closed" error
      if (
        !(error instanceof Error) ||
        !error.message.includes("client is closed")
      ) {
        logger.error("Error disconnecting Redis", { error });
      }
    }
  }
  redis = null;
  isConnected = false;
  initPromise = null;
}

/**
 * Safe wrapper for Redis operations
 * Returns null on any error, allowing fallback to PostgreSQL
 */
export async function safeRedisOp<T>(
  operation: () => Promise<T>
): Promise<T | null> {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    return await operation();
  } catch (error) {
    logger.error("Redis operation failed", { error });
    return null;
  }
}

/**
 * Redis Health Check Result
 */
export interface RedisHealthResult {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * PING-based Redis health check
 *
 * Validates actual connectivity by executing a PING command.
 * This prevents false positives where the client is created but
 * cannot actually communicate with Redis.
 *
 * SECURITY: Never logs or exposes Redis credentials
 *
 * @returns Health status with connection state and latency
 */
export async function checkRedisHealth(): Promise<RedisHealthResult> {
  // Check if Redis URL is configured
  if (!config.redis.url) {
    return { connected: false, error: "REDIS_URL not configured" };
  }

  // Ensure Redis is initialized (lazy init for serverless)
  await ensureRedis();

  // Check client state
  if (!redis || !isConnected) {
    return { connected: false, error: "Redis client not connected" };
  }

  // Execute PING to validate actual connectivity
  const start = Date.now();
  try {
    const pong = await redis.ping();
    const latencyMs = Date.now() - start;

    if (pong === "PONG") {
      return { connected: true, latencyMs };
    } else {
      return { connected: false, error: "Unexpected PING response" };
    }
  } catch (err) {
    // Sanitize error - never expose connection details
    const message = err instanceof Error ? err.message : "PING failed";
    // Remove any potential URL or credential leaks from error message
    const sanitizedMessage = message
      .replace(/redis[s]?:\/\/[^\s]+/gi, "[REDACTED]")
      .replace(/password[=:][^\s]+/gi, "[REDACTED]");

    return { connected: false, error: sanitizedMessage };
  }
}
