/**
 * Settings Routes
 *
 * GET    /api/settings/organization - Get organization settings
 * PATCH  /api/settings/organization - Update organization settings
 * GET    /api/settings/security     - Get security settings
 * PATCH  /api/settings/security     - Update security settings
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import * as settingsController from "../controllers/settings.controller.js";

const router: IRouter = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /settings/organization - Get organization settings
 */
router.get(
  "/organization",
  requirePermission("org:read"),
  settingsController.getOrganization
);

/**
 * PATCH /settings/organization - Update organization settings
 */
router.patch(
  "/organization",
  requirePermission("org:manage"),
  settingsController.updateOrganization
);

/**
 * GET /settings/security - Get security settings
 */
router.get(
  "/security",
  requirePermission("settings:read"),
  settingsController.getSecurity
);

/**
 * PATCH /settings/security - Update security settings
 */
router.patch(
  "/security",
  requirePermission("settings:update"),
  settingsController.updateSecurity
);

/**
 * GET /settings/billing - Get billing/plan information
 */
router.get(
  "/billing",
  requirePermission("billing:read"),
  settingsController.getBilling
);

export default router;
