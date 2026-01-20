/**
 * Sessions Routes
 *
 * GET    /api/sessions           - List sessions (own or org-wide)
 * GET    /api/sessions/me        - Get my sessions only
 * GET    /api/sessions/current   - Get current session info
 * POST   /api/sessions/:id/revoke - Revoke a session
 * POST   /api/sessions/logout-all - Logout all sessions
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as sessionController from "../controllers/session.controller.js";

const router: IRouter = Router();

// All routes require authentication
router.use(requireAuth);

// Get current session info
router.get("/current", sessionController.getCurrent);

// Get my sessions only (user-scoped)
router.get("/me", sessionController.getMySessionsOnly);

// List sessions (users see own, admins see org-wide)
router.get("/", sessionController.list);

// Logout all sessions
router.post("/logout-all", sessionController.logoutAll);

// Revoke a specific session
router.post("/:id/revoke", sessionController.revoke);

export default router;
