/**
 * Permission Service
 *
 * Handles permission resolution and checking with wildcard support.
 * This service aggregates permissions across multiple user roles
 * and provides utility functions for permission checks.
 */
import { query } from "../config/db.js";

/**
 * Get all permissions for a user by aggregating across all assigned roles
 */
export async function resolvePermissions(userId: string): Promise<string[]> {
  const result = await query(
    `SELECT DISTINCT unnest(r.permissions) as permission
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId]
  );

  return result.rows.map((row) => row.permission);
}

/**
 * Check if user has a specific permission
 * Supports wildcard (*) which grants all permissions
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Wildcard grants all access
  if (userPermissions.includes("*")) {
    return true;
  }

  // Direct permission check
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check for resource-level wildcard (e.g., 'users:*' matches 'users:read')
  const [resource] = requiredPermission.split(":");
  if (userPermissions.includes(`${resource}:*`)) {
    return true;
  }

  return false;
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  if (requiredPermissions.length === 0) {
    return true; // No permissions required = granted
  }

  return requiredPermissions.some((p) => hasPermission(userPermissions, p));
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  if (requiredPermissions.length === 0) {
    return true;
  }

  return requiredPermissions.every((p) => hasPermission(userPermissions, p));
}

/**
 * List of all valid permissions in the system
 * Used for validation when creating/updating roles
 */
export const ALL_PERMISSIONS = [
  // Organization
  "org:read",
  "org:manage",
  "org:delete",

  // Users
  "users:read",
  "users:create",
  "users:invite",
  "users:update",
  "users:delete",
  "users:disable",

  // Roles
  "roles:read",
  "roles:assign",
  "roles:manage",

  // Clients (OAuth)
  "clients:read",
  "clients:create",
  "clients:update",
  "clients:delete",
  "clients:manage",

  // Sessions
  "sessions:read",
  "sessions:read:self",
  "sessions:revoke",
  "sessions:delete",

  // MFA
  "mfa:read",
  "mfa:manage",
  "mfa:manage:self",

  // Logs/Audit
  "logs:read",
  "audit:read",

  // Analytics
  "analytics:read",
  "analytics:security",

  // Settings
  "settings:read",
  "settings:update",
  "settings:manage",

  // Billing
  "billing:read",
  "billing:manage",

  // Profile
  "profile:read",
  "profile:update",

  // Fingerprinting
  "fingerprinting:read",
  "fingerprinting:write",

  // Security Overview
  "security:overview:read",

  // Data Export
  "data:export",

  // Workflow Manage
  "workflows:manage",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number] | "*";

/**
 * Validate that all permissions in an array are valid
 */
export function validatePermissions(permissions: string[]): {
  valid: boolean;
  invalid: string[];
} {
  const invalid = permissions.filter(
    (p) => p !== "*" && !(ALL_PERMISSIONS as readonly string[]).includes(p)
  );

  return {
    valid: invalid.length === 0,
    invalid,
  };
}
