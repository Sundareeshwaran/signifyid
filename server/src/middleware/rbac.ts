/**
 * RBAC Middleware
 *
 * Role-based access control for routes.
 * Reads permissions from JWT payload and supports wildcard matching.
 */
import type { Request, Response, NextFunction } from "express";
import {
  hasPermission,
  hasAnyPermission,
} from "../services/permission.service.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import { config } from "../config/env.js";

/**
 * Require specific permission(s) - user must have AT LEAST ONE
 */
export function requirePermission(...permissions: string[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Get permissions from JWT payload
    const userPermissions = req.user.permissions || [];

    // Check if user has any of the required permissions
    const hasAccess = hasAnyPermission(userPermissions, permissions);

    if (!hasAccess) {
      // Log denied access attempt
      try {
        await AuditLogModel.create(
          req.user.org_id,
          req.user.sub,
          "access.denied",
          {
            required_permissions: permissions,
            user_permissions: userPermissions,
            path: req.path,
            method: req.method,
          }
        );
      } catch (err) {
        console.error("Failed to log access denial:", err);
      }

      // Production: generic error, Development: include required permissions for debugging
      res
        .status(403)
        .json(
          config.nodeEnv === "production"
            ? { error: "Access denied" }
            : { error: "Insufficient permissions", required: permissions }
        );
      return;
    }

    next();
  };
}

/**
 * Require ALL specified permissions
 */
export function requireAllPermissions(...permissions: string[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const userPermissions = req.user.permissions || [];

    const hasAllAccess = permissions.every((p) =>
      hasPermission(userPermissions, p)
    );

    if (!hasAllAccess) {
      try {
        await AuditLogModel.create(
          req.user.org_id,
          req.user.sub,
          "access.denied",
          {
            required_permissions: permissions,
            user_permissions: userPermissions,
            path: req.path,
            method: req.method,
          }
        );
      } catch (err) {
        console.error("Failed to log access denial:", err);
      }

      // Production: generic error, Development: include required permissions for debugging
      res
        .status(403)
        .json(
          config.nodeEnv === "production"
            ? { error: "Access denied" }
            : { error: "Insufficient permissions", required: permissions }
        );
      return;
    }

    next();
  };
}

/**
 * Require specific role(s) - user must have AT LEAST ONE
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some((r) => userRoles.includes(r));

    if (!hasRole) {
      // Production: generic error, Development: include required roles for debugging
      res
        .status(403)
        .json(
          config.nodeEnv === "production"
            ? { error: "Access denied" }
            : { error: "Insufficient role", required: roles }
        );
      return;
    }

    next();
  };
}

/**
 * Middleware to check permission inline (for conditional logic in controllers)
 */
export function checkPermission(
  permissions: string[],
  userPermissions: string[]
): boolean {
  return hasAnyPermission(userPermissions, permissions);
}
