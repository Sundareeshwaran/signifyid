/**
 * MFA Routes
 * 
 * GET /mfa/status - Check MFA status
 * POST /mfa/enroll - Start MFA enrollment
 * POST /mfa/verify - Complete MFA enrollment
 * POST /mfa/challenge - Verify MFA during login
 * DELETE /mfa/disable - Disable MFA
 */
import { Router, type IRouter } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as mfaController from '../controllers/mfa.controller.js';

const router: IRouter = Router();

// Get MFA status (requires auth)
router.get('/status', requireAuth, mfaController.getStatus);

// Start enrollment (requires auth)
router.post('/enroll', requireAuth, mfaController.enroll);

// Complete enrollment (requires auth)
router.post('/verify', requireAuth, mfaController.verify);

// MFA challenge during login (no auth - uses userId in body)
router.post('/challenge', mfaController.challenge);

// Disable MFA (requires auth + current code)
router.delete('/disable', requireAuth, mfaController.disable);

export default router;
