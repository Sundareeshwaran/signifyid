/**
 * Analytics Routes
 *
 * GET /api/analytics/overview     - Complete analytics overview
 * GET /api/analytics/login-trends - Daily login trends
 * GET /api/analytics/client-usage - Per-client usage stats
 * GET /api/analytics/security     - Security metrics
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import * as analyticsController from "../controllers/analytics.controller.js";

const router: IRouter = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /analytics/overview - Complete analytics overview
 */
router.get(
  "/overview",
  requirePermission("analytics:read"),
  analyticsController.getOverview
);

/**
 * GET /analytics/login-trends - Daily login trends
 * Query params: days (default 7)
 */
router.get(
  "/login-trends",
  requirePermission("analytics:read"),
  analyticsController.getLoginTrends
);

/**
 * GET /analytics/client-usage - Per-client usage stats
 */
router.get(
  "/client-usage",
  requirePermission("analytics:read"),
  analyticsController.getClientUsage
);

/**
 * GET /analytics/security - Security metrics
 */
router.get(
  "/security",
  requirePermission("analytics:security"),
  analyticsController.getSecurity
);

/**
 * GET /analytics/users - User analytics
 */
router.get(
  "/users",
  requirePermission("analytics:read"),
  analyticsController.getUsers
);

/**
 * GET /analytics/sessions - Session analytics
 */
router.get(
  "/sessions",
  requirePermission("analytics:read"),
  analyticsController.getSessions
);

/**
 * GET /analytics/logins - Login activities time-series
 * Query params: range (7d|30d|90d), group_by (day|hour)
 */
router.get(
  "/logins",
  requirePermission("analytics:read"),
  analyticsController.getLoginActivities
);

export default router;
