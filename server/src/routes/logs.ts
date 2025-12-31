/**
 * Audit Logs Routes
 *
 * GET /logs - List audit logs (paginated)
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import * as logsController from "../controllers/logs.controller.js";

const router: IRouter = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /logs - List audit logs for the organization
 */
router.get("/", requirePermission("logs:read"), logsController.list);

export default router;
