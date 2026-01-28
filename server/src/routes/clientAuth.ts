/**
 * Client Auth Routes
 *
 * Routes for client-based site authentication
 */
import { Router } from "express";
import type { IRouter } from "express";
import * as clientAuthController from "../controllers/clientAuth.controller.js";
import { createRedisRateLimiter } from "../middleware/redisRateLimit.js";

const router: IRouter = Router();

// Redis-backed rate limiters for client auth
const clientLoginRateLimiter = createRedisRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  keyPrefix: "client:login",
  message: {
    error: "too_many_requests",
    error_description: "Too many login attempts. Please try again in 1 minute.",
  },
});

const clientSessionValidateRateLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: "client:validate",
  message: {
    error: "too_many_requests",
    error_description:
      "Too many session validation requests. Please try again later.",
  },
});

router.get("/test", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * POST /api/client-auth/login
 * Authenticate client using Client ID + Secret
 */
router.post("/login", clientLoginRateLimiter, clientAuthController.login);

/**
 * POST /api/client-auth/session/validate
 * Validate active client session
 */
router.post(
  "/session/validate",
  clientSessionValidateRateLimiter,
  clientAuthController.validateSession,
);

/**
 * GET /api/client-auth/session/validate
 * Validate active client session (alternative to POST)
 */
router.get(
  "/session/validate",
  clientSessionValidateRateLimiter,
  clientAuthController.validateSession,
);

/**
 * POST /api/client-auth/logout
 * Revoke client session
 */
router.post("/logout", clientAuthController.logout);

/**
 * GET /api/client-auth/callback
 * Dynamic callback handler for client sites
 */
router.get("/callback", clientAuthController.callback);

export default router;
