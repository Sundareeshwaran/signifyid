/**
 * Authentication Routes
 *
 * POST /api/auth/register - Create organization + admin
 * POST /api/auth/login - Login and get tokens
 * POST /api/auth/refresh - Refresh access token
 * POST /api/auth/logout - Revoke tokens
 * GET /api/auth/me - Get current user
 * GET /api/auth/google - Initiate Google OAuth
 * GET /api/auth/google/callback - Google OAuth callback
 * POST /api/auth/sso - Initiate SSO login
 * GET /api/auth/sso/callback - SSO callback
 *
 * WebAuthn Passkey Routes:
 * POST /api/auth/webauthn/register/options - Get registration options
 * POST /api/auth/webauthn/register/verify - Verify registration
 * POST /api/auth/webauthn/login/options - Get authentication options
 * POST /api/auth/webauthn/login/verify - Verify authentication
 * GET /api/auth/webauthn/credentials - List passkeys
 * DELETE /api/auth/webauthn/credentials/:id - Delete passkey
 * PATCH /api/auth/webauthn/credentials/:id - Update passkey
 * GET /api/auth/webauthn/check/:email - Check if user has passkeys
 */
import { Router, type IRouter } from "express";
import { validate, schemas } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import * as authController from "../controllers/auth.controller.js";
import * as googleController from "../controllers/google.controller.js";
import * as ssoController from "../controllers/sso.controller.js";
import * as webauthnController from "../controllers/webauthn.controller.js";

const router: IRouter = Router();

// Register new organization
router.post("/register", validate(schemas.register), authController.register);

// Login
router.post("/login", validate(schemas.login), authController.login);

// Refresh token
router.post("/refresh", authController.refresh);

// Logout (requires auth)
router.post("/logout", requireAuth, authController.logout);

// Get current user (requires auth)
router.get("/me", requireAuth, authController.me);

// Google OAuth
router.get("/google", googleController.initiateGoogle);
router.get("/google/callback", googleController.googleCallback);

// SSO (Enterprise OIDC)
router.post("/sso", ssoController.initiateSso);
router.get("/sso/callback", ssoController.ssoCallback);

// WebAuthn Passkey routes
// Registration (requires auth - user must be logged in to add passkeys)
router.post(
  "/webauthn/register/options",
  requireAuth,
  webauthnController.getRegistrationOptions
);
router.post(
  "/webauthn/register/verify",
  requireAuth,
  webauthnController.verifyRegistration
);

// Authentication (public - this IS the login)
router.post(
  "/webauthn/login/options",
  webauthnController.getAuthenticationOptions
);
router.post("/webauthn/login/verify", webauthnController.verifyAuthentication);

// Credential management (requires auth)
router.get(
  "/webauthn/credentials",
  requireAuth,
  webauthnController.listCredentials
);
router.delete(
  "/webauthn/credentials/:id",
  requireAuth,
  webauthnController.deleteCredential
);
router.patch(
  "/webauthn/credentials/:id",
  requireAuth,
  webauthnController.updateCredential
);

// Check if user has passkeys (public - for showing passkey option on login)
router.get("/webauthn/check/:email", webauthnController.checkPasskeys);

export default router;
