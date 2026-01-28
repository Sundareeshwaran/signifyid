/**
 * Rate Limiting Middleware
 *
 * Prevents abuse of OAuth endpoints with configurable rate limits
 */
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

/**
 * Rate limiter for /oauth/authorize endpoint
 * Allows 10 requests per minute per IP
 */
export const authorizeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "too_many_requests",
    error_description:
      "Too many authorization requests. Please try again later.",
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "too_many_requests",
      error_description:
        "Too many authorization requests. Please try again later.",
      retry_after: 60,
    });
  },
});

/**
 * Rate limiter for /oauth/verify-authorize endpoint
 * Stricter limit (5 requests per minute) due to MFA verification
 */
export const verifyAuthorizeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "too_many_requests",
    error_description:
      "Too many verification attempts. Please try again later.",
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "too_many_requests",
      error_description:
        "Too many verification attempts. Please try again later.",
      retry_after: 60,
    });
  },
});

/**
 * Rate limiter for /oauth/token endpoint
 * Allows 10 requests per minute per IP
 */
export const tokenRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "too_many_requests",
    error_description: "Too many token requests. Please try again later.",
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "too_many_requests",
      error_description: "Too many token requests. Please try again later.",
      retry_after: 60,
    });
  },
});

/**
 * Rate limiter for /api/client-auth/login endpoint
 * Very strict limit: 3 attempts per 15 minutes to prevent brute force
 */
export const clientLoginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "too_many_requests",
    error_description: "Too many login attempts. Please try again in 1 minute.",
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "too_many_requests",
      error_description:
        "Too many login attempts. Please try again in 1 minute.",
      retry_after: 60, // 1 minute in seconds
    });
  },
});

/**
 * Rate limiter for /api/client-auth/session/validate endpoint
 * Moderate limit: 30 requests per minute
 */
export const clientSessionValidateRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "too_many_requests",
    error_description:
      "Too many session validation requests. Please try again later.",
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "too_many_requests",
      error_description:
        "Too many session validation requests. Please try again later.",
      retry_after: 60,
    });
  },
});

/**
 * Rate limiter for /api/export endpoints
 * Strict limit: 3 exports per 5 minutes (resource-intensive operation)
 */
export const exportRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "too_many_requests",
    error_description:
      "Too many export requests. Please try again in 5 minutes.",
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "too_many_requests",
      error_description:
        "Too many export requests. Please try again in 5 minutes.",
      retry_after: 300, // 5 minutes in seconds
    });
  },
});
