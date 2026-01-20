/**
 * WebAuthn Controller
 *
 * Handles WebAuthn/FIDO2 passkey registration and authentication.
 * Production-ready with Redis-backed challenge storage, input validation,
 * rate limiting, and security logging.
 */
import type { Request, Response } from "express";
import { z } from "zod";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error.middleware.js";
import * as ChallengeCache from "../cache/challenge.cache.js";
import * as RateCache from "../cache/rate.cache.js";
import * as PasskeyModel from "../models/Passkey.model.js";
import * as UserModel from "../models/User.model.js";
import * as SessionModel from "../models/Session.model.js";
import * as RoleModel from "../models/Role.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import { generateTokenPair } from "../services/token.service.js";

// ============================================================================
// Configuration Constants
// ============================================================================

const RP_NAME = "Signify iD";
const RP_ID = config.webauthn?.rpId || "localhost";
const ORIGIN = config.webauthn?.origin || "http://localhost:3000";
const CHALLENGE_TTL_SECONDS = 300; // 5 minutes

// Rate limit configuration
const RATE_LIMITS = {
  authOptions: { maxRequests: 10, windowSeconds: 60 }, // 10 req/min
  authVerify: { maxRequests: 5, windowSeconds: 60 }, // 5 req/min (stricter)
  checkPasskeys: { maxRequests: 20, windowSeconds: 60 }, // 20 req/min
} as const;

// ============================================================================
// Validation Schemas
// ============================================================================

const EmailSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
});

// WebAuthn credential objects are validated by @simplewebauthn/server
// We only validate presence and basic structure here
const VerifyRegistrationSchema = z.object({
  credential: z
    .any()
    .refine(
      (val): val is Record<string, unknown> =>
        val && typeof val === "object" && typeof val.id === "string",
      { message: "Invalid credential format" }
    ),
  deviceName: z.string().max(100).optional(),
});

const VerifyAuthenticationSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
  credential: z
    .any()
    .refine(
      (val): val is Record<string, unknown> =>
        val && typeof val === "object" && typeof val.id === "string",
      { message: "Invalid credential format" }
    ),
});

const UpdateCredentialSchema = z.object({
  deviceName: z
    .string()
    .min(1)
    .max(100, "Device name must be 1-100 characters"),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get client IP, handling proxies
 */
function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown"
  );
}

/**
 * Check rate limit and throw AppError if exceeded
 */
async function checkRateLimit(
  req: Request,
  endpoint: keyof typeof RATE_LIMITS
): Promise<void> {
  const clientIp = getClientIp(req);
  const limits = RATE_LIMITS[endpoint];

  const result = await RateCache.increment(
    clientIp,
    `webauthn:${endpoint}`,
    limits.maxRequests,
    limits.windowSeconds
  );

  if (!result.allowed) {
    logger.security("rate_limit_exceeded", {
      endpoint: `webauthn:${endpoint}`,
      ip: clientIp,
      current: result.current,
    });
    throw new AppError(
      "Too many requests. Please try again later.",
      429,
      "RATE_LIMITED"
    );
  }
}

/**
 * Validate request body against a Zod schema
 */
function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => issue.message).join(", ");
    throw new AppError(errors, 400, "VALIDATION_ERROR");
  }
  return result.data;
}

/**
 * Ensure user is authenticated
 */
function requireAuth(req: Request): {
  userId: string;
  email: string;
  orgId: string;
  displayName?: string | null;
} {
  const { sub, email, org_id, display_name } = req.user || {};
  if (!sub || !email || !org_id) {
    throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
  }
  return { userId: sub, email, orgId: org_id, displayName: display_name };
}

// ============================================================================
// Controller Handlers
// ============================================================================

/**
 * POST /auth/webauthn/register/options
 * Generate registration options for creating a new passkey
 * Requires authentication
 */
export async function getRegistrationOptions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId, email, displayName } = requireAuth(req);

    // Get existing passkeys for this user to exclude
    const existingCredentials = await PasskeyModel.findByUserId(userId);
    const excludeCredentials = existingCredentials.map((cred) => ({
      id: cred.credential_id,
      transports: cred.transports as AuthenticatorTransportFuture[],
    }));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: email,
      userDisplayName: displayName || email,
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      attestationType: "none",
    });

    // Store challenge in Redis (or memory fallback)
    await ChallengeCache.store(
      `reg:${userId}`,
      options.challenge,
      CHALLENGE_TTL_SECONDS
    );

    res.json(options);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("WebAuthn registration options error", error);
    throw new AppError(
      "Failed to generate registration options",
      500,
      "WEBAUTHN_REG_OPTIONS_ERROR"
    );
  }
}

/**
 * POST /auth/webauthn/register/verify
 * Verify and store new passkey credential
 * Requires authentication
 */
export async function verifyRegistration(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId, orgId } = requireAuth(req);
    const { credential, deviceName } = validateBody(
      VerifyRegistrationSchema,
      req.body
    );

    // Get stored challenge
    const expectedChallenge = await ChallengeCache.get(`reg:${userId}`);
    if (!expectedChallenge) {
      throw new AppError(
        "Registration session expired. Please try again.",
        400,
        "CHALLENGE_EXPIRED"
      );
    }

    const verification = await verifyRegistrationResponse({
      response: credential as unknown as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      logger.security("passkey.registration_failed", { userId });
      throw new AppError(
        "Passkey verification failed",
        400,
        "VERIFICATION_FAILED"
      );
    }

    const { credential: registrationCredential, credentialBackedUp } =
      verification.registrationInfo;

    // Store the credential
    const credentialResponse = (
      credential as unknown as RegistrationResponseJSON
    ).response;
    const passkey = await PasskeyModel.create({
      userId,
      credentialId: registrationCredential.id,
      publicKey: Buffer.from(registrationCredential.publicKey).toString(
        "base64"
      ),
      counter: registrationCredential.counter,
      transports: credentialResponse.transports || [],
      deviceName: deviceName || "My Passkey",
      authenticatorAAGUID: verification.registrationInfo.aaguid,
      backedUp: credentialBackedUp,
    });

    // Clear the challenge (prevent replay)
    await ChallengeCache.clear(`reg:${userId}`);

    // Audit log
    await AuditLogModel.create(orgId, userId, "passkey.registered", {
      passkey_id: passkey.id,
      device_name: deviceName,
    });

    logger.info(`Passkey registered for user ${userId}`);

    res.json({
      success: true,
      passkey: {
        id: passkey.id,
        deviceName: passkey.device_name,
        createdAt: passkey.created_at,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("WebAuthn registration verification error", error);
    throw new AppError(
      "Failed to verify registration",
      500,
      "WEBAUTHN_REG_VERIFY_ERROR"
    );
  }
}

/**
 * POST /auth/webauthn/login/options
 * Generate authentication options for passkey login
 * No authentication required (public endpoint with rate limiting)
 */
export async function getAuthenticationOptions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    await checkRateLimit(req, "authOptions");

    const { email } = validateBody(EmailSchema, req.body);

    // Get user's passkeys
    const credentials = await PasskeyModel.findByUserEmail(email);

    if (credentials.length === 0) {
      // Don't reveal if user exists - use generic message
      throw new AppError(
        "No passkeys available for this account",
        404,
        "NO_PASSKEYS"
      );
    }

    const allowCredentials = credentials.map((cred) => ({
      id: cred.credential_id,
      transports: cred.transports as AuthenticatorTransportFuture[],
    }));

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: "required",
    });

    // Store challenge (use email as key since user isn't authenticated yet)
    await ChallengeCache.store(
      `auth:${email}`,
      options.challenge,
      CHALLENGE_TTL_SECONDS
    );

    res.json(options);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("WebAuthn authentication options error", error);
    throw new AppError(
      "Failed to generate authentication options",
      500,
      "WEBAUTHN_AUTH_OPTIONS_ERROR"
    );
  }
}

/**
 * POST /auth/webauthn/login/verify
 * Verify passkey signature and issue session tokens
 * No authentication required (this IS the login) - strict rate limiting
 */
export async function verifyAuthentication(
  req: Request,
  res: Response
): Promise<void> {
  const clientIp = getClientIp(req);

  try {
    await checkRateLimit(req, "authVerify");

    const { email, credential } = validateBody(
      VerifyAuthenticationSchema,
      req.body
    );

    // Get stored challenge
    const expectedChallenge = await ChallengeCache.get(`auth:${email}`);
    if (!expectedChallenge) {
      throw new AppError(
        "Authentication session expired. Please try again.",
        400,
        "CHALLENGE_EXPIRED"
      );
    }

    // Find the passkey
    const credentialId = (credential as unknown as AuthenticationResponseJSON)
      .id;
    const passkey = await PasskeyModel.findByCredentialId(credentialId);
    if (!passkey) {
      logger.security("passkey.unknown_credential", { email, ip: clientIp });
      throw new AppError("Authentication failed", 401, "AUTH_FAILED");
    }

    // Get the user
    const user = await UserModel.findById(passkey.user_id);
    if (!user) {
      throw new AppError("Authentication failed", 401, "AUTH_FAILED");
    }

    // Check user status
    if (user.status !== "active") {
      logger.security("passkey.inactive_user", {
        userId: user.id,
        status: user.status,
        ip: clientIp,
      });
      throw new AppError("Account is not active", 403, "ACCOUNT_INACTIVE");
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential as unknown as AuthenticationResponseJSON,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.credential_id,
        publicKey: new Uint8Array(Buffer.from(passkey.public_key, "base64")),
        counter: Number(passkey.counter),
        transports: passkey.transports as AuthenticatorTransportFuture[],
      },
    });

    if (!verification.verified) {
      await AuditLogModel.create(user.org_id, user.id, "passkey.auth_failed", {
        credential_id: credentialId,
        ip: clientIp,
      });
      logger.security("passkey.auth_failed", { userId: user.id, ip: clientIp });
      throw new AppError("Authentication failed", 401, "AUTH_FAILED");
    }

    // Update the counter (prevents cloned credential attacks)
    await PasskeyModel.updateCounter(
      passkey.credential_id,
      verification.authenticationInfo.newCounter
    );

    // Clear the challenge (prevent replay)
    await ChallengeCache.clear(`auth:${email}`);

    // Update last login timestamp
    await UserModel.updateLastLogin(user.id);

    // Get roles and permissions
    const roles = await RoleModel.getUserRoles(user.id);
    const permissions = await RoleModel.getUserPermissions(user.id);

    // Create session (passkey auth counts as MFA verified)
    const session = await SessionModel.create({
      userId: user.id,
      orgId: user.org_id,
      mfaVerified: true,
      expiresAt: new Date(Date.now() + config.cookie.refreshExpires),
      ipAddress: clientIp,
      userAgent: req.headers["user-agent"],
    });

    // Generate tokens
    const tokens = await generateTokenPair(
      user,
      session.id,
      roles,
      permissions
    );

    // Audit logs
    await AuditLogModel.create(user.org_id, user.id, "session.created", {
      session_id: session.id,
      auth_method: "passkey",
      ip: clientIp,
    });
    await AuditLogModel.create(user.org_id, user.id, "passkey.auth_success", {
      passkey_id: passkey.id,
    });

    logger.info(`Passkey authentication successful for user ${user.id}`);

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "lax" as const,
      path: "/",
    };

    res.cookie("accessToken", tokens.accessToken, {
      ...cookieOptions,
      maxAge: config.cookie.accessExpires,
    });
    res.cookie("refreshToken", tokens.refreshToken, {
      ...cookieOptions,
      maxAge: config.cookie.refreshExpires,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        orgId: user.org_id,
      },
      roles,
      mfaVerified: true,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("WebAuthn authentication verification error", error);
    throw new AppError(
      "Failed to verify authentication",
      500,
      "WEBAUTHN_AUTH_VERIFY_ERROR"
    );
  }
}

/**
 * GET /auth/webauthn/credentials
 * List user's registered passkeys
 * Requires authentication
 */
export async function listCredentials(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId } = requireAuth(req);

    const passkeys = await PasskeyModel.findByUserId(userId);

    res.json({
      passkeys: passkeys.map((p) => ({
        id: p.id,
        deviceName: p.device_name,
        createdAt: p.created_at,
        lastUsedAt: p.last_used_at,
        backedUp: p.backed_up,
      })),
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("List passkeys error", error);
    throw new AppError("Failed to list passkeys", 500, "WEBAUTHN_LIST_ERROR");
  }
}

/**
 * DELETE /auth/webauthn/credentials/:id
 * Remove a passkey
 * Requires authentication
 */
export async function deleteCredential(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId, orgId } = requireAuth(req);
    const passkeyId = req.params.id;

    if (!passkeyId) {
      throw new AppError("Passkey ID is required", 400, "MISSING_PASSKEY_ID");
    }

    const deleted = await PasskeyModel.deletePasskey(passkeyId, userId);

    if (!deleted) {
      throw new AppError("Passkey not found", 404, "PASSKEY_NOT_FOUND");
    }

    await AuditLogModel.create(orgId, userId, "passkey.deleted", {
      passkey_id: passkeyId,
    });

    logger.info(`Passkey ${passkeyId} deleted for user ${userId}`);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("Delete passkey error", error);
    throw new AppError(
      "Failed to delete passkey",
      500,
      "WEBAUTHN_DELETE_ERROR"
    );
  }
}

/**
 * PATCH /auth/webauthn/credentials/:id
 * Update passkey device name
 * Requires authentication
 */
export async function updateCredential(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId } = requireAuth(req);
    const passkeyId = req.params.id;
    const { deviceName } = validateBody(UpdateCredentialSchema, req.body);

    if (!passkeyId) {
      throw new AppError("Passkey ID is required", 400, "MISSING_PASSKEY_ID");
    }

    await PasskeyModel.updateDeviceName(passkeyId, userId, deviceName);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("Update passkey error", error);
    throw new AppError(
      "Failed to update passkey",
      500,
      "WEBAUTHN_UPDATE_ERROR"
    );
  }
}

/**
 * GET /auth/webauthn/check/:email
 * Check if user has passkeys (for showing passkey login option)
 * No authentication required - rate limited
 */
export async function checkPasskeys(
  req: Request,
  res: Response
): Promise<void> {
  try {
    await checkRateLimit(req, "checkPasskeys");

    const email = req.params.email;

    if (!email) {
      throw new AppError("Email is required", 400, "MISSING_EMAIL");
    }

    // Basic email format validation
    const emailResult = z.string().email().safeParse(email);
    if (!emailResult.success) {
      throw new AppError("Invalid email format", 400, "INVALID_EMAIL");
    }

    const credentials = await PasskeyModel.findByUserEmail(email);

    res.json({
      hasPasskeys: credentials.length > 0,
      count: credentials.length,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("Check passkeys error", error);
    throw new AppError("Failed to check passkeys", 500, "WEBAUTHN_CHECK_ERROR");
  }
}
