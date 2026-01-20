import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import * as securityController from "../controllers/security.controller.js";

const router: IRouter = Router();

/**
 * Security Routes
 *
 * All routes require authentication and specific permissions
 */

// GET /api/security/overview - Get security metrics overview
router.get(
  "/overview",
  requireAuth,
  requirePermission("security:overview:read"),
  securityController.getSecurityOverview
);

export default router;
