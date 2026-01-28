/**
 * Redis Rate Limiting Middleware
 *
 * Provides flexible rate limiting using Redis for distributed systems.
 * Falls back to allowing requests if Redis is unavailable.
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import * as rateCache from "../cache/rate.cache.js";

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyPrefix: string; // Prefix for rate limit key (e.g., "auth", "api")
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: {
    error: string;
    error_description: string;
  };
}

const defaultMessage = {
  error: "too_many_requests",
  error_description: "Too many requests. Please try again later.",
};

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Create a Redis-backed rate limiter
 */
export function createRedisRateLimiter(
  options: RateLimitOptions,
): RequestHandler {
  const {
    windowMs,
    max,
    keyPrefix,
    keyGenerator = (req: Request) => getClientIp(req),
    message = defaultMessage,
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Generate rate limit key
    const identifier = keyGenerator(req);
    const endpoint = keyPrefix;

    // Increment counter and check limit
    const result = await rateCache.increment(
      identifier,
      endpoint,
      max,
      windowSeconds,
    );

    // Set rate limit headers
    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", result.remaining);
    res.setHeader(
      "RateLimit-Reset",
      Math.ceil(result.resetAt.getTime() / 1000),
    );

    if (!result.allowed) {
      const retryAfter = Math.ceil(
        (result.resetAt.getTime() - Date.now()) / 1000,
      );
      res.setHeader("Retry-After", retryAfter);

      res.status(429).json({
        ...message,
        retry_after: retryAfter,
      });
      return;
    }

    next();
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Strict rate limiter for authentication endpoints (5 per minute)
export const authRateLimiter: RequestHandler = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  keyPrefix: "auth",
  message: {
    error: "too_many_requests",
    error_description:
      "Too many authentication attempts. Please try again later.",
  },
});

// Moderate rate limiter for API endpoints (60 per minute)
export const apiRateLimiter: RequestHandler = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: "api",
});

// Very strict rate limiter for sensitive operations (3 per 15 minutes)
export const sensitiveRateLimiter: RequestHandler = createRedisRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 3,
  keyPrefix: "sensitive",
  message: {
    error: "too_many_requests",
    error_description: "Too many attempts. Please try again in 1 minute.",
  },
});

// Rate limiter for OAuth token endpoint (10 per minute)
export const tokenRateLimiter: RequestHandler = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: "oauth:token",
  message: {
    error: "too_many_requests",
    error_description: "Too many token requests. Please try again later.",
  },
});

// Rate limiter for session validation (30 per minute)
export const sessionValidateRateLimiter: RequestHandler =
  createRedisRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    keyPrefix: "session:validate",
    message: {
      error: "too_many_requests",
      error_description:
        "Too many session validation requests. Please try again later.",
    },
  });
