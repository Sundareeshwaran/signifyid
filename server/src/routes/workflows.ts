/**
 * Workflow Routes
 *
 * GET /api/workflows - List workflows
 * POST /api/workflows - Create workflow
 * GET /api/workflows/triggers - Get available trigger types
 * GET /api/workflows/actions - Get available action types
 * GET /api/workflows/conditions - Get available condition fields
 * GET /api/workflows/:id - Get workflow details
 * PUT /api/workflows/:id - Update workflow
 * DELETE /api/workflows/:id - Delete workflow
 * POST /api/workflows/:id/publish - Publish workflow
 * POST /api/workflows/:id/disable - Disable workflow
 * POST /api/workflows/:id/duplicate - Duplicate workflow
 * POST /api/workflows/:id/validate - Validate workflow
 * POST /api/workflows/:id/preview - Preview/simulate workflow
 * POST /api/workflows/:id/execute - Execute published workflow
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import * as workflowController from "../controllers/workflow.controller.js";

const router: IRouter = Router();

// All routes require authentication
router.use(requireAuth);

// List workflows
router.get("/", requirePermission("workflows:manage"), workflowController.list);

// Get available trigger types
router.get(
  "/triggers",
  requirePermission("workflows:manage"),
  workflowController.getTriggerTypes
);

// Get available action types
router.get(
  "/actions",
  requirePermission("workflows:manage"),
  workflowController.getActionTypes
);

// Get available condition fields
router.get(
  "/conditions",
  requirePermission("workflows:manage"),
  workflowController.getConditionFields
);

// Create workflow
router.post(
  "/",
  requirePermission("workflows:manage"),
  workflowController.create
);

// Get workflow by ID
router.get(
  "/:id",
  requirePermission("workflows:manage"),
  workflowController.getById
);

// Update workflow
router.put(
  "/:id",
  requirePermission("workflows:manage"),
  workflowController.update
);

// Delete workflow
router.delete(
  "/:id",
  requirePermission("workflows:manage"),
  workflowController.remove
);

// Publish workflow
router.post(
  "/:id/publish",
  requirePermission("workflows:manage"),
  workflowController.publish
);

// Disable workflow
router.post(
  "/:id/disable",
  requirePermission("workflows:manage"),
  workflowController.disable
);

// Duplicate workflow
router.post(
  "/:id/duplicate",
  requirePermission("workflows:manage"),
  workflowController.duplicate
);

// Validate workflow
router.post(
  "/:id/validate",
  requirePermission("workflows:manage"),
  workflowController.validate
);

// Preview/simulate workflow
router.post(
  "/:id/preview",
  requirePermission("workflows:manage"),
  workflowController.preview
);

// Execute workflow (only published workflows)
router.post(
  "/:id/execute",
  requirePermission("workflows:manage"),
  workflowController.execute
);

export default router;
