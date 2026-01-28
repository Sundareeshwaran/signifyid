/**
 * Redis Configuration
 *
 * Redis client singleton for caching layer using ioredis.
 * Provides graceful fallback if Redis is unavailable.
 *
 * VERCEL SERVERLESS COMPATIBLE:
 * - Lazy initialization with lazyConnect: true
 * - Race condition protection for cold starts
 * - PING-based health validation
 * - Safe for multiple concurrent invocations
 * - Automatic reconnection with exponential backoff
 *
 * IOREDIS MIGRATION NOTES:
 * - ioredis connects automatically on first command when lazyConnect is false
 * - With lazyConnect: true, explicit connect() is required
 * - Method names are lowercase (setex vs setEx) - ioredis handles both
 * - TLS is configured via tls option, not socket.tls
 */
import Redis from "ioredis";
import { config } from "./env.js";
import { logger } from "./logger.js";

/**
 * Single Redis client instance (singleton pattern)
 * Null until first initialization
 */
let redis: Redis | null = null;

/**
 * Connection state tracking
 * Separate from redis.status to handle initialization edge cases
 */
let isConnected = false;

/**
 * Promise for ongoing initialization (prevents race conditions in serverless)
 */
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

      // Create ioredis client with production-safe configuration
      redis = new Redis(config.redis.url, {
        // Lazy connect: don't connect until first command or explicit connect()
        lazyConnect: true,

        // Connection timeout (10 seconds - increased for cold starts)
        connectTimeout: 10000,

        // Command timeout (10 seconds per command)
        commandTimeout: 10000,

        // Retry strategy with exponential backoff
        retryStrategy: (times: number) => {
          if (times > 10) {
            logger.error("Redis: Max reconnection attempts reached");
            return null; // Stop retrying
          }
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          const delay = Math.min(times * 100, 3000);
          logger.info(`Redis: Retry attempt ${times}, waiting ${delay}ms`);
          return delay;
        },

        // Max retries per request (for individual commands)
        maxRetriesPerRequest: 3,

        // TLS configuration for Redis Cloud and other hosted Redis services
        // ioredis requires tls option to be set explicitly for rediss:// URLs
        ...(useTls
          ? {
              tls: {
                rejectUnauthorized: false,
              },
            }
          : {}),

        // Enable offline queue for better reliability
        enableOfflineQueue: true,

        // DNS resolution: Try both IPv4 and IPv6
        family: 0,
      });

      // Event handlers - log non-sensitive connection events only
      redis.on("error", (err: Error) => {
        // Log full error details (code, errno) for debugging
        const errorCode = (err as NodeJS.ErrnoException).code || "UNKNOWN";
        const errorMessage = err.message || "No error message";
        // Sanitize error message to prevent credential leakage
        const sanitizedMessage = errorMessage
          .replace(/redis[s]?:\/\/[^\s]+/gi, "[REDACTED]")
          .replace(/password[=:][^\s]+/gi, "[REDACTED]");
        logger.error("Redis error", {
          code: errorCode,
          message: sanitizedMessage,
        });
        isConnected = false;
      });

      redis.on("connect", () => {
        logger.info("Redis connected");
        isConnected = true;
      });

      redis.on("reconnecting", () => {
        logger.info("Redis reconnecting...");
      });

      redis.on("close", () => {
        logger.warn("Redis connection closed");
        isConnected = false;
      });

      redis.on("ready", () => {
        logger.info("Redis ready");
        isConnected = true;
      });

      // Explicitly connect (required with lazyConnect: true)
      await redis.connect();
    } catch (error) {
      // Sanitize error for logging but include error code for debugging
      const errorCode = (error as NodeJS.ErrnoException).code || "UNKNOWN";
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const sanitizedMessage = errorMessage
        .replace(/redis[s]?:\/\/[^\s]+/gi, "[REDACTED]")
        .replace(/password[=:][^\s]+/gi, "[REDACTED]");
      logger.error("Failed to connect to Redis", {
        code: errorCode,
        error: sanitizedMessage,
      });
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
 *
 * Note: This returns the ioredis client. Method names are lowercase
 * but ioredis is case-insensitive for most operations.
 */
export function getRedis(): Redis | null {
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
        !error.message.includes("Connection is closed")
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
  operation: () => Promise<T>,
): Promise<T | null> {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    return await operation();
  } catch (error) {
    // Sanitize error message
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const sanitizedMessage = errorMessage
      .replace(/redis[s]?:\/\/[^\s]+/gi, "[REDACTED]")
      .replace(/password[=:][^\s]+/gi, "[REDACTED]");
    logger.error("Redis operation failed", { error: sanitizedMessage });
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
