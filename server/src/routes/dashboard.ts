/**
 * Dashboard Routes
 *
 * GET /dashboard/stats - Get aggregated dashboard statistics
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as dashboardController from "../controllers/dashboard.controller.js";

const router: IRouter = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /dashboard/stats - Get aggregated stats for the dashboard
 */
router.get("/stats", dashboardController.getStats);

/**
 * GET /dashboard/activity - Get recent activity for the dashboard
 */
router.get("/activity", dashboardController.getActivity);

export default router;
