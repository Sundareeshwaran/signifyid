/**
 * Auth Controller
 *
 * Handles authentication business logic
 */
import type { Request, Response } from "express";
import { config } from "../config/env.js";
import * as UserModel from "../models/User.model.js";
import * as OrganizationModel from "../models/Organization.model.js";
import * as RoleModel from "../models/Role.model.js";
import * as SessionModel from "../models/Session.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import {
  generateTokenPair,
  verifyRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
} from "../services/token.service.js";
import * as authView from "../views/auth.view.js";

/**
 * Helper to set auth cookies
 */
function setCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
) {
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
}

/**
 * Register new organization with admin user
 */
export async function register(req: Request, res: Response) {
  try {
    const { organizationName, domain, email, password, name } = req.body;

    // Check if email already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Create organization and admin user
    const { org, user } = await OrganizationModel.create(
      organizationName,
      domain,
      email,
      password,
      name
    );

    // Generate tokens
    const roles = await RoleModel.getUserRoles(user.id);
    const permissions = await RoleModel.getUserPermissions(user.id);

    // Create session (no MFA for registration)
    const session = await SessionModel.create({
      userId: user.id,
      orgId: org.id,
      mfaVerified: false,
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
    await AuditLogModel.create(org.id, user.id, "session.created", {
      session_id: session.id,
      ip: req.ip,
      user_agent: req.headers["user-agent"],
    });

    // Set cookies
    setCookies(res, tokens);

    res.status(201).json(authView.formatRegistration(user, org, roles));
  } catch (error: any) {
    console.error("Register error:", error);
    if (error.code === "23505") {
      res.status(409).json({ error: "Domain already registered" });
      return;
    }
    res.status(500).json({ error: "Registration failed" });
  }
}

/**
 * Login with email and password
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Verify password
    const validPassword = await UserModel.verifyPassword(
      user.password_hash,
      password
    );
    if (!validPassword) {
      await AuditLogModel.create(user.org_id, user.id, "auth.login_failed", {
        reason: "invalid_password",
      });
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Check user status
    if (user.status !== "active") {
      res.status(403).json({ error: "Account is not active" });
      return;
    }

    // Check if MFA is enabled
    const { hasVerifiedMfa } = await import("../models/Mfa.model.js");
    const mfaEnabled = await hasVerifiedMfa(user.id);

    if (mfaEnabled) {
      // Don't issue tokens yet - require MFA verification
      await AuditLogModel.create(
        user.org_id,
        user.id,
        "auth.login_mfa_required",
        { ip: req.ip }
      );

      res.json({
        mfaRequired: true,
        userId: user.id,
        message: "MFA verification required",
      });
      return;
    }

    // No MFA - proceed with normal login
    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Get roles/permissions and generate tokens
    const roles = await RoleModel.getUserRoles(user.id);
    const permissions = await RoleModel.getUserPermissions(user.id);

    // Create session (MFA not verified for this login)
    const session = await SessionModel.create({
      userId: user.id,
      orgId: user.org_id,
      mfaVerified: false,
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
    });

    // Set cookies
    setCookies(res, tokens);

    // Create audit log
    await AuditLogModel.create(user.org_id, user.id, "auth.login", {
      ip: req.ip,
    });

    res.json(authView.formatLogin(user, roles, false));
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ error: "Refresh token required" });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    // Check if token is still valid in database
    const isValid = await isRefreshTokenValid(payload.sub, refreshToken);
    if (!isValid) {
      res.status(401).json({ error: "Refresh token revoked" });
      return;
    }

    // Get fresh user data
    const user = await UserModel.findById(payload.sub);
    if (!user || user.status !== "active") {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }

    if (payload.sessionId) {
      const session = await SessionModel.findById(payload.sessionId);
      if (!session || session.revoked) {
        res.status(401).json({ error: "Session invalid or revoked" });
        return;
      }

      // Update session last activity
      await SessionModel.updateLastActivity(payload.sessionId);
    }

    // Generate new tokens
    const roles = await RoleModel.getUserRoles(user.id);
    const permissions = await RoleModel.getUserPermissions(user.id);
    const tokens = await generateTokenPair(
      {
        id: user.id,
        org_id: user.org_id,
        email: user.email,
        display_name: user.display_name,
      },
      payload.sessionId || "legacy-session",
      roles,
      permissions
    );

    // Set cookies
    setCookies(res, tokens);

    res.json({ message: "Token refreshed" });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ error: "Token refresh failed" });
  }
}

/**
 * Logout - revoke refresh token
 */
export async function logout(req: Request, res: Response) {
  try {
    if (req.user) {
      await revokeRefreshToken(req.user.sub);
      await AuditLogModel.create(
        req.user.org_id,
        req.user.sub,
        "auth.logout",
        {}
      );

      if (req.user.sessionId) {
        await SessionModel.revoke(req.user.sessionId, req.user.org_id);
      }
    }

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
}

/**
 * Get current user info
 */
export async function me(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await UserModel.findById(req.user.sub);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(authView.formatMe(user));
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Failed to get user info" });
  }
}
