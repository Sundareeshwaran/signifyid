import { Router } from "express";
import * as SupportController from "../controllers/support.controller.js";

const router: Router = Router();

// Public contact endpoint (protected by rate limiting in controller/global middleware)
router.post("/contact", SupportController.contactSales);

export { router as supportRouter };
