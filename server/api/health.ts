/**
 * Health Check Endpoint
 *
 * Production health check that works directly as a Vercel function.
 * Includes Redis connectivity status for infrastructure monitoring.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRedisHealth } from "../src/config/redis.js";

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  // Check Redis connectivity with PING validation
  const redisHealth = await checkRedisHealth();

  // Determine overall status - still "ok" if Redis is down (graceful degradation)
  // but include Redis status for monitoring
  const overallStatus = "ok";

  res.status(200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    message: "Signify iD API is running",
    services: {
      redis: {
        connected: redisHealth.connected,
        latencyMs: redisHealth.latencyMs,
        // Only include error in response for debugging (consider removing in strict production)
        ...(redisHealth.error && { status: "unavailable" }),
      },
    },
  });
}
