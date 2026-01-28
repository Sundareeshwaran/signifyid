/**
 * Internal Redis Health Check Endpoint
 *
 * Detailed Redis connectivity verification for internal monitoring.
 * Returns 503 if Redis is unavailable, 200 if healthy.
 *
 * SECURITY NOTE:
 * - This endpoint should be protected in production (e.g., API key, IP whitelist)
 * - Error messages are sanitized - no credentials exposed
 *
 * Usage:
 * - Vercel monitoring / health checks
 * - Admin dashboard status panels
 * - Infrastructure alerting systems
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRedisHealth } from "../../src/config/redis.js";

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  // Execute PING-based health check
  const health = await checkRedisHealth();

  // Return 503 if Redis is unavailable (useful for monitoring alerts)
  const statusCode = health.connected ? 200 : 503;

  res.status(statusCode).json({
    service: "redis",
    connected: health.connected,
    latencyMs: health.latencyMs,
    error: health.error,
    timestamp: new Date().toISOString(),
  });
}
