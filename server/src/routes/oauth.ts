/**
 * OAuth2/OIDC Routes
 *
 * GET /oauth/authorize - Get client info for consent
 * POST /oauth/authorize - User approves/denies
 * POST /oauth/token - Exchange code for tokens
 * GET /oauth/userinfo - Get user profile
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as oauthController from "../controllers/oauth.controller.js";
import {
  createRedisRateLimiter,
  tokenRateLimiter,
} from "../middleware/redisRateLimit.js";

const router: IRouter = Router();

// Redis-backed rate limiters for OAuth
const authorizeRateLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: "oauth:authorize",
  message: {
    error: "too_many_requests",
    error_description:
      "Too many authorization requests. Please try again later.",
  },
});

const verifyAuthorizeRateLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  keyPrefix: "oauth:verify",
  message: {
    error: "too_many_requests",
    error_description:
      "Too many verification attempts. Please try again later.",
  },
});

// Authorization endpoint - get client info (public, rate limited)
router.get("/authorize", authorizeRateLimiter, oauthController.getAuthorize);

// Authorization endpoint - user approves (requires auth, rate limited)
router.post(
  "/authorize",
  authorizeRateLimiter,
  requireAuth,
  oauthController.postAuthorize
);

// NEW: MFA-verified authorization endpoint (requires auth, stricter rate limit)
router.post(
  "/verify-authorize",
  verifyAuthorizeRateLimiter,
  requireAuth,
  oauthController.verifyAndAuthorize
);

// Token endpoint (public - uses client credentials, rate limited)
router.post("/token", tokenRateLimiter, oauthController.token);

// UserInfo endpoint (requires auth via access token)
router.get("/userinfo", requireAuth, oauthController.userInfo);

export default router;
