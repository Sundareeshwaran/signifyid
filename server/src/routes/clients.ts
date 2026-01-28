/**
 * OAuth Clients Routes
 *
 * GET /api/clients - List clients
 * POST /api/clients - Create client
 * GET /api/clients/:id - Get client
 * PATCH /api/clients/:id - Update client
 * DELETE /api/clients/:id - Delete client
 * POST /api/clients/:id/regenerate-secret - Regenerate secret
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { validate, schemas } from "../middleware/validate.js";
import * as clientController from "../controllers/client.controller.js";

const router: IRouter = Router();

// All routes require authentication
router.use(requireAuth);

// List clients
router.get("/", requirePermission("clients:read"), clientController.list);

// Create client
router.post(
  "/",
  requirePermission("clients:create"),
  validate(schemas.createClient),
  clientController.create
);

// Get client by ID
router.get("/:id", requirePermission("clients:read"), clientController.getById);

// Update client
router.patch(
  "/:id",
  requirePermission("clients:update"),
  clientController.update
);

// Delete client
router.delete(
  "/:id",
  requirePermission("clients:delete"),
  clientController.remove
);

// Regenerate secret
router.post(
  "/:id/regenerate-secret",
  requirePermission("clients:update"),
  clientController.regenerateSecret
);

// Disable client
router.post(
  "/:id/disable",
  requirePermission("clients:update"),
  clientController.disable
);

// Enable client
router.post(
  "/:id/enable",
  requirePermission("clients:update"),
  clientController.enable
);

export default router;
