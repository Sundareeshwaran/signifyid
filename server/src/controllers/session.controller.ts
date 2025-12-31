/**
 * Session Controller
 *
 * Handles session management business logic including
 * listing, revocation, and logout functionality.
 */
import type { Request, Response } from "express";
import * as SessionModel from "../models/Session.model.js";
import * as TokenModel from "../models/Token.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import { hasPermission } from "../services/permission.service.js";

/**
 * List sessions
 * - Users see only their own sessions
 * - Admins with sessions:read see all org sessions
 */
export async function list(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const orgId = req.user!.org_id;
    const userPermissions = req.user!.permissions || [];
    const { page = "1", limit = "50" } = req.query;

    console.log("Session List Request:", {
      userId,
      orgId,
      permissions: userPermissions,
    });

    // Check if user can see all org sessions
    const canSeeAllSessions = hasPermission(userPermissions, "sessions:read");

    if (canSeeAllSessions) {
      // Admin view - all org sessions
      const result = await SessionModel.listByOrg(orgId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.json({
        sessions: result.sessions.map(formatSession),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(limit as string)),
        },
      });
    } else {
      // User view - own sessions only
      console.log("Listing sessions for user:", userId);
      const result = await SessionModel.listByUser(userId, orgId);
      console.log(
        "Found sessions count:",
        result.sessions.length,
        "total:",
        result.total
      );

      res.json({
        sessions: result.sessions.map(formatSession),
        pagination: {
          page: 1,
          limit: result.sessions.length,
          total: result.total,
          pages: 1,
        },
      });
    }
  } catch (error) {
    console.error("List sessions error:", error);
    res.status(500).json({ error: "Failed to list sessions" });
  }
}

/**
 * Revoke a specific session
 */
export async function revoke(req: Request, res: Response) {
  try {
    const sessionId = req.params.id;
    const userId = req.user!.sub;
    const orgId = req.user!.org_id;
    const userPermissions = req.user!.permissions || [];

    // Find the session
    const session = await SessionModel.findByIdInOrg(sessionId, orgId);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Check if already revoked
    if (session.revoked) {
      res.status(410).json({ error: "Session already revoked" });
      return;
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      res.status(410).json({ error: "Session has expired" });
      return;
    }

    // Users can revoke their own sessions, admins can revoke any in org
    const isOwnSession = session.user_id === userId;
    const canRevokeOthers = hasPermission(userPermissions, "sessions:revoke");

    if (!isOwnSession && !canRevokeOthers) {
      res.status(403).json({ error: "Cannot revoke this session" });
      return;
    }

    // Revoke the session
    await SessionModel.revoke(sessionId, orgId);

    // Audit log
    await AuditLogModel.create(orgId, userId, "session.revoked", {
      revoked_session_id: sessionId,
      target_user_id: session.user_id,
    });

    res.json({ message: "Session revoked successfully" });
  } catch (error) {
    console.error("Revoke session error:", error);
    res.status(500).json({ error: "Failed to revoke session" });
  }
}

/**
 * Logout all sessions for the current user
 */
export async function logoutAll(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const orgId = req.user!.org_id;

    // Revoke all sessions
    const revokedCount = await SessionModel.revokeAllForUser(userId);

    // Also revoke all refresh tokens
    await TokenModel.revokeAll(userId);

    // Audit log
    await AuditLogModel.create(orgId, userId, "session.logout_all", {
      revoked_count: revokedCount,
    });

    res.json({
      message: "All sessions logged out successfully",
      revokedCount,
    });
  } catch (error) {
    console.error("Logout all error:", error);
    res.status(500).json({ error: "Failed to logout all sessions" });
  }
}

/**
 * Get my sessions only (user-scoped)
 * - Regular users see only their own sessions
 * - Super admins see all organization sessions
 */
export async function getMySessionsOnly(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const orgId = req.user!.org_id;
    const userRoles = req.user!.roles || [];
    const { page = "1", limit = "10" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // Check if user is super_admin
    const isSuperAdmin = userRoles.includes("super_admin");

    if (isSuperAdmin) {
      // Super admin view - all org sessions
      console.log("Super admin viewing all org sessions");
      const result = await SessionModel.listByOrg(orgId, {
        page: pageNum,
        limit: limitNum,
      });

      res.json({
        sessions: result.sessions.map(formatSession),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          pages: Math.ceil(result.total / limitNum),
        },
      });
    } else {
      // Regular user view - own sessions only
      console.log("Getting my sessions for user:", userId);
      const result = await SessionModel.listByUser(userId, orgId, {
        page: pageNum,
        limit: limitNum,
      });
      console.log(
        "Found sessions count:",
        result.sessions.length,
        "total:",
        result.total
      );

      res.json({
        sessions: result.sessions.map(formatSession),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          pages: Math.ceil(result.total / limitNum),
        },
      });
    }
  } catch (error) {
    console.error("Get my sessions error:", error);
    res.status(500).json({ error: "Failed to get sessions" });
  }
}

/**
 * Get current session info
 */
export async function getCurrent(req: Request, res: Response) {
  try {
    // For now, we don't have session ID in the JWT
    // This would require tracking session in the token
    res.json({
      user: {
        id: req.user!.sub,
        email: req.user!.email,
        orgId: req.user!.org_id,
      },
      authenticated: true,
    });
  } catch (error) {
    console.error("Get current session error:", error);
    res.status(500).json({ error: "Failed to get session info" });
  }
}

/**
 * Format session for API response
 */
function formatSession(
  session: SessionModel.SessionRow & { user_email?: string; user_name?: string }
) {
  return {
    id: session.id,
    userId: session.user_id,
    userEmail: (session as any).user_email || undefined,
    userName: (session as any).user_name || undefined,
    clientId: session.client_id,
    deviceInfo: session.device_info,
    ipAddress: session.ip_address,
    userAgent: session.user_agent,
    mfaVerified: session.mfa_verified,
    issuedAt: session.created_at,
    lastActivityAt: session.last_activity_at,
    expiresAt: session.expires_at,
    revoked: session.revoked,
  };
}
