/**
 * MFA Controller
 *
 * Handles MFA enrollment, verification, and management
 */
import type { Request, Response } from "express";
import { config } from "../config/env.js";
import * as MfaModel from "../models/Mfa.model.js";
import * as UserModel from "../models/User.model.js";
import * as RoleModel from "../models/Role.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import * as SessionModel from "../models/Session.model.js";
import { generateTokenPair } from "../services/token.service.js";

/**
 * GET /api/mfa/status
 *
 * Check if current user has MFA enabled
 */
export async function getStatus(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const methods = await MfaModel.getByUserId(req.user.sub);
    const hasMfa = methods.some((m) => m.verified);

    res.json({
      enabled: hasMfa,
      methods: methods.map((m) => ({
        id: m.id,
        type: m.type,
        verified: m.verified,
        createdAt: m.created_at,
      })),
    });
  } catch (error) {
    console.error("GET /api/mfa/status error:", error);
    res.status(500).json({ error: "Failed to get MFA status" });
  }
}

/**
 * POST /api/mfa/enroll
 *
 * Start MFA enrollment - generates secret and returns QR code URI
 */
export async function enroll(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { type = "totp" } = req.body;

    if (type !== "totp") {
      res.status(400).json({ error: "Only TOTP is currently supported" });
      return;
    }

    // Get user email for QR code
    const user = await UserModel.findById(req.user.sub);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Generate secret
    const secret = MfaModel.generateSecret();

    // Save unverified MFA method
    const mfa = await MfaModel.create(req.user.sub, "totp", secret);

    // Generate QR URI
    const totpUri = MfaModel.generateTotpUri(secret, user.email);

    // Audit log
    await AuditLogModel.create(
      req.user.org_id,
      req.user.sub,
      "mfa.enroll_started",
      { type }
    );

    res.json({
      id: mfa.id,
      secret, // Base32 secret for manual entry
      totpUri, // For QR code generation
      message:
        "Scan the QR code with your authenticator app, then verify with a code",
    });
  } catch (error) {
    console.error("POST /api/mfa/enroll error:", error);
    res.status(500).json({ error: "Failed to start MFA enrollment" });
  }
}

/**
 * POST /api/mfa/verify
 *
 * Complete MFA enrollment by verifying a code
 */
export async function verify(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { code } = req.body;

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      res.status(400).json({ error: "Invalid code format" });
      return;
    }

    // Get the pending MFA method
    const mfa = await MfaModel.getWithSecret(req.user.sub, "totp");
    if (!mfa) {
      res.status(400).json({ error: "No pending MFA enrollment found" });
      return;
    }

    // Verify the code
    const valid = MfaModel.verifyTotp(mfa.secret, code);
    if (!valid) {
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }

    // Mark as verified
    await MfaModel.setVerified(mfa.id);

    // Audit log
    await AuditLogModel.create(req.user.org_id, req.user.sub, "mfa.enabled", {
      type: "totp",
    });

    res.json({
      message: "MFA enabled successfully",
      enabled: true,
    });
  } catch (error) {
    console.error("POST /api/mfa/verify error:", error);
    res.status(500).json({ error: "Failed to verify MFA" });
  }
}

/**
 * POST /api/mfa/challenge
 *
 * Verify MFA during login - issues tokens if successful
 */
export async function challenge(req: Request, res: Response) {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      res.status(400).json({ error: "userId and code are required" });
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ error: "Invalid code format" });
      return;
    }

    // Get user's TOTP method
    const mfa = await MfaModel.getWithSecret(userId, "totp");
    if (!mfa || !mfa.verified) {
      res.status(400).json({ error: "MFA not enabled for this user" });
      return;
    }

    // Verify the code
    const valid = MfaModel.verifyTotp(mfa.secret, code);
    if (!valid) {
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }

    // Get user and generate tokens
    const user = await UserModel.findById(userId);
    if (!user || user.status !== "active") {
      res.status(400).json({ error: "User not found or inactive" });
      return;
    }

    const roles = await RoleModel.getUserRoles(userId);
    const permissions = await RoleModel.getUserPermissions(userId);
    // Create session
    const session = await SessionModel.create({
      userId: user.id,
      orgId: user.org_id,
      mfaVerified: true,
      expiresAt: new Date(Date.now() + config.cookie.refreshExpires),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const tokens = await generateTokenPair(
      user,
      session.id,
      roles,
      permissions
    );

    // Audit log for session creation
    await AuditLogModel.create(user.org_id, user.id, "session.created", {
      session_id: session.id,
      ip: req.ip,
      user_agent: req.headers["user-agent"],
      mfa_verified: true,
    });

    // Set cookies
    const sameSite = config.cookie.sameSite.toLowerCase() as
      | "lax"
      | "strict"
      | "none";

    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite,
      maxAge: config.cookie.accessExpires,
      path: "/",
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite,
      maxAge: config.cookie.refreshExpires,
      path: "/api/auth/refresh",
    });

    // Audit log
    await AuditLogModel.create(
      user.org_id,
      user.id,
      "mfa.challenge_passed",
      {}
    );

    res.json({
      message: "MFA verification successful",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        roles,
      },
    });
  } catch (error) {
    console.error("POST /api/mfa/challenge error:", error);
    res.status(500).json({ error: "MFA verification failed" });
  }
}

/**
 * DELETE /api/mfa/disable
 *
 * Disable MFA for the current user
 */
export async function disable(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { code } = req.body;

    // Require current TOTP code to disable
    if (!code || !/^\d{6}$/.test(code)) {
      res.status(400).json({ error: "Current MFA code required to disable" });
      return;
    }

    const mfa = await MfaModel.getWithSecret(req.user.sub, "totp");
    if (!mfa || !mfa.verified) {
      res.status(400).json({ error: "MFA not enabled" });
      return;
    }

    // Verify current code
    const valid = MfaModel.verifyTotp(mfa.secret, code);
    if (!valid) {
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }

    // Remove all MFA methods
    await MfaModel.removeAll(req.user.sub);

    // Audit log
    await AuditLogModel.create(
      req.user.org_id,
      req.user.sub,
      "mfa.disabled",
      {}
    );

    res.json({
      message: "MFA disabled successfully",
      enabled: false,
    });
  } catch (error) {
    console.error("DELETE /api/mfa/disable error:", error);
    res.status(500).json({ error: "Failed to disable MFA" });
  }
}
