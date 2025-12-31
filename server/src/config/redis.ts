/**
 * Redis Configuration
 *
 * Redis client singleton for caching layer.
 * Provides graceful fallback if Redis is unavailable.
 */
import { createClient, RedisClientType } from "redis";
import { config } from "./env.js";

let redis: RedisClientType | null = null;
let isConnected = false;

/**
 * Initialize Redis client
 * Call this during app startup
 */
export async function initRedis(): Promise<void> {
  // Skip if no Redis URL configured
  if (!config.redis.url) {
    console.log("⚠️  Redis URL not configured, caching disabled");
    return;
  }

  try {
    redis = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error("❌ Redis: Max reconnection attempts reached");
            return new Error("Max reconnection attempts reached");
          }
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 5000,
      },
    });

    // Event handlers
    redis.on("error", (err) => {
      console.error("❌ Redis error:", err.message);
      isConnected = false;
    });

    redis.on("connect", () => {
      console.log("✅ Redis connected");
      isConnected = true;
    });

    redis.on("reconnecting", () => {
      console.log("🔄 Redis reconnecting...");
    });

    redis.on("end", () => {
      console.log("⚠️  Redis connection closed");
      isConnected = false;
    });

    // Connect to Redis
    await redis.connect();
  } catch (error) {
    console.error("❌ Failed to connect to Redis:", error);
    redis = null;
    isConnected = false;
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
      console.log("✅ Redis disconnected gracefully");
    } catch (error) {
      // Only log if it's not a "client already closed" error
      if (
        !(error instanceof Error) ||
        !error.message.includes("client is closed")
      ) {
        console.error("❌ Error disconnecting Redis:", error);
      }
    }
  }
  redis = null;
  isConnected = false;
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
    console.error("Redis operation failed:", error);
    return null;
  }
}
