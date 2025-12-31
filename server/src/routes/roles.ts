/**
 * Role Management Routes
 *
 * GET /api/roles - List roles
 * POST /api/roles - Create custom role
 * GET /api/roles/permissions - Get available permissions list
 * GET /api/roles/:id - Get role details
 * PATCH /api/roles/:id - Update role
 * DELETE /api/roles/:id - Delete custom role
 * POST /api/roles/:id/assign - Assign role to user
 * POST /api/roles/:id/unassign - Remove role from user
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import * as roleController from "../controllers/role.controller.js";

const router: IRouter = Router();

// All routes require authentication
router.use(requireAuth);

// List roles
router.get("/", requirePermission("roles:read"), roleController.list);

// Get available permissions
router.get(
  "/permissions",
  requirePermission("roles:read"),
  roleController.getPermissions
);

// Create custom role
router.post("/", requirePermission("roles:manage"), roleController.create);

// Get role by ID
router.get("/:id", requirePermission("roles:read"), roleController.getById);

// Update role
router.patch("/:id", requirePermission("roles:manage"), roleController.update);

// Delete role
router.delete("/:id", requirePermission("roles:manage"), roleController.remove);

// Assign role to user
router.post(
  "/:id/assign",
  requirePermission("roles:manage"),
  roleController.assignToUser
);

// Remove role from user
router.post(
  "/:id/unassign",
  requirePermission("roles:manage"),
  roleController.removeFromUser
);

export default router;
