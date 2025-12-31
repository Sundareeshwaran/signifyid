/**
 * User Management Routes
 *
 * GET    /api/users           - List users (paginated, with filters)
 * POST   /api/users           - Create user (super_admin only)
 * POST   /api/users/invite    - Invite user (admin)
 * POST   /api/users/invite/accept - Accept invite (public)
 * GET    /api/users/invite/validate - Validate invite token (public)
 * POST   /api/users/activate  - Activate invited user (public, legacy)
 * GET    /api/users/me        - Get own profile
 * PATCH  /api/users/me        - Update own profile
 * GET    /api/users/:id       - Get user by ID
 * PATCH  /api/users/:id       - Update user
 * DELETE /api/users/:id       - Delete user (super_admin only, soft delete)
 * PUT    /api/users/:id/roles - Assign/update roles
 * POST   /api/users/:id/disable - Disable user
 * POST   /api/users/:id/enable  - Enable disabled user
 * POST   /api/users/:id/reset-mfa - Reset user MFA
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, requireRole } from "../middleware/rbac.js";
import { validate, schemas } from "../middleware/validate.js";
import * as userController from "../controllers/user.controller.js";

const router: IRouter = Router();

// ==========================================
// PUBLIC ROUTES (no auth required)
// ==========================================

// Legacy activation endpoint
router.post(
  "/activate",
  validate(schemas.activateUser),
  userController.activate
);

// Accept invite with token
router.post(
  "/invite/accept",
  validate(schemas.acceptInvite),
  userController.acceptInvite
);

// Validate invite token
router.get("/invite/validate", userController.validateInviteToken);

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

// All routes below require authentication
router.use(requireAuth);

// Profile routes (any authenticated user)
router.get("/me", userController.getProfile);
router.patch(
  "/me",
  validate(schemas.updateProfile),
  userController.updateProfile
);

// List users
router.get("/", requirePermission("users:read"), userController.list);

// Create user (super_admin only - direct creation with password)
router.post(
  "/",
  requireRole("super_admin"),
  validate(schemas.createUser),
  userController.create
);

// Invite user (tenant_admin+ - invite-based flow)
router.post(
  "/invite",
  requirePermission("users:invite"),
  validate(schemas.inviteUser),
  userController.invite
);

// Get user by ID
router.get("/:id", requirePermission("users:read"), userController.getById);

// Update user
router.patch(
  "/:id",
  requirePermission("users:update"),
  validate(schemas.updateUser),
  userController.update
);

// Delete user (super_admin and tenant_admin, soft delete)
router.delete(
  "/:id",
  requirePermission("users:delete"),
  userController.deleteUser
);

// Assign/update user roles
router.put(
  "/:id/roles",
  requirePermission("roles:assign"),
  validate(schemas.assignRoles),
  userController.assignRoles
);

// Disable user (explicit endpoint)
router.post(
  "/:id/disable",
  requirePermission("users:disable"),
  userController.disableExplicit
);

// Enable user
router.post(
  "/:id/enable",
  requirePermission("users:update"),
  userController.enable
);

// Reset user MFA (requires users:update permission)
router.post(
  "/:id/reset-mfa",
  requirePermission("users:update"),
  userController.resetMfa
);

export default router;
