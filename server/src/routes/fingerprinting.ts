/**
 * Fingerprinting Routes
 *
 * GET /fingerprinting/settings - Get fingerprinting settings
 * PATCH /fingerprinting/settings - Update fingerprinting settings
 * GET /fingerprinting/devices - List trusted devices
 * GET /fingerprinting/risk-events - List recent risk events
 * GET /fingerprinting/stats - Get aggregated stats
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import * as fingerprintingController from "../controllers/fingerprinting.controller.js";

const router: IRouter = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /fingerprinting/settings - Get organization fingerprinting settings
 */
router.get(
  "/settings",
  requirePermission("fingerprinting:read"),
  fingerprintingController.getSettings
);

/**
 * PATCH /fingerprinting/settings - Update fingerprinting settings
 */
router.patch(
  "/settings",
  requirePermission("fingerprinting:write"),
  fingerprintingController.updateSettings
);

/**
 * GET /fingerprinting/devices - List trusted devices for the organization
 */
router.get(
  "/devices",
  requirePermission("fingerprinting:read"),
  fingerprintingController.getDevices
);

/**
 * GET /fingerprinting/risk-events - List recent risk events
 */
router.get(
  "/risk-events",
  requirePermission("fingerprinting:read"),
  fingerprintingController.getRiskEvents
);

/**
 * GET /fingerprinting/stats - Get aggregated fingerprinting stats
 */
router.get(
  "/stats",
  requirePermission("fingerprinting:read"),
  fingerprintingController.getStats
);

export default router;
