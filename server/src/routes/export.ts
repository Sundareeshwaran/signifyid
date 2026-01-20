/**
 * Export Routes
 *
 * Handles data export endpoints with RBAC and rate limiting
 */
import { Router } from "express";
import * as exportController from "../controllers/export.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { exportRateLimiter } from "../middleware/rate-limit.js";
import type { Router as RouterType } from "express";

const router: RouterType = Router();

// All export routes require authentication and data:export permission
router.use(requireAuth);
router.use(requirePermission("data:export"));
router.use(exportRateLimiter);

// Export endpoints
router.post("/users", exportController.exportUsers);
router.post("/clients", exportController.exportClients);

export default router;
