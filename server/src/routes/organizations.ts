/**
 * Organizations Routes
 *
 * DELETE /api/organizations/:orgId - Delete an organization (super_admin only)
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole, requirePermission } from "../middleware/rbac.js";
import * as organizationsController from "../controllers/organizations.controller.js";

const router: IRouter = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * DELETE /organizations/:orgId - Soft delete an organization
 */
router.delete(
  "/:orgId",
  requireRole("super_admin"),
  requirePermission("org:delete"),
  organizationsController.deleteOrganization
);

/**
 * GET /organizations/:orgId - Get organization details (for deletion confirmation)
 */
router.get(
  "/:orgId",
  requireRole("super_admin"),
  organizationsController.getById
);

export default router;
