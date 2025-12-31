/**
 * RBAC Constants
 *
 * Defines fixed roles and permissions for the DIAM platform.
 * These are constants used on both client and server.
 */

// Available roles in the system
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  TENANT_ADMIN: "tenant_admin",
  SECURITY_ADMIN: "security_admin",
  DEVELOPER: "developer",
  USER: "user",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

// All valid role names as an array
export const VALID_ROLES: RoleName[] = Object.values(ROLES);

// Role hierarchy (higher index = more permissions, for display purposes)
export const ROLE_HIERARCHY: RoleName[] = [
  ROLES.USER,
  ROLES.DEVELOPER,
  ROLES.SECURITY_ADMIN,
  ROLES.TENANT_ADMIN,
  ROLES.SUPER_ADMIN,
];

// Role display names for UI
export const ROLE_DISPLAY_NAMES: Record<RoleName, string> = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.TENANT_ADMIN]: "Tenant Admin",
  [ROLES.SECURITY_ADMIN]: "Security Admin",
  [ROLES.DEVELOPER]: "Developer",
  [ROLES.USER]: "User",
};

// ==========================================
// PERMISSIONS
// ==========================================

export const PERMISSIONS = {
  // Organization
  ORG_READ: "org:read",
  ORG_MANAGE: "org:manage",
  ORG_DELETE: "org:delete", // super_admin only

  // Users
  USERS_READ: "users:read",
  USERS_CREATE: "users:create", // super_admin only (direct create)
  USERS_INVITE: "users:invite", // tenant_admin+ (invite flow)
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_DISABLE: "users:disable",

  // Roles
  ROLES_READ: "roles:read",
  ROLES_ASSIGN: "roles:assign",
  ROLES_MANAGE: "roles:manage",

  // Clients (OAuth)
  CLIENTS_READ: "clients:read",
  CLIENTS_CREATE: "clients:create",
  CLIENTS_UPDATE: "clients:update",
  CLIENTS_DELETE: "clients:delete",
  CLIENTS_MANAGE: "clients:manage", // combined CRUD

  // Sessions
  SESSIONS_READ: "sessions:read",
  SESSIONS_READ_SELF: "sessions:read:self",
  SESSIONS_REVOKE: "sessions:revoke",
  SESSIONS_DELETE: "sessions:delete",

  // MFA
  MFA_READ: "mfa:read",
  MFA_MANAGE: "mfa:manage",
  MFA_MANAGE_SELF: "mfa:manage:self",

  // Logs/Audit
  LOGS_READ: "logs:read",
  AUDIT_READ: "audit:read",

  // Analytics
  ANALYTICS_READ: "analytics:read",
  ANALYTICS_SECURITY: "analytics:security",

  // Security Overview
  SECURITY_OVERVIEW_READ: "security:overview:read",

  // Settings
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",
  SETTINGS_MANAGE: "settings:manage",

  // Billing
  BILLING_READ: "billing:read",
  BILLING_MANAGE: "billing:manage",

  // Profile (self)
  PROFILE_READ: "profile:read",
  PROFILE_UPDATE: "profile:update",

  // Fingerprinting
  FINGERPRINTING_READ: "fingerprinting:read",
  FINGERPRINTING_WRITE: "fingerprinting:write",

  // Data Export
  DATA_EXPORT: "data:export",

  // Workflows
  WORKFLOWS_MANAGE: "workflows:manage",

  // Wildcard
  ALL: "*",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ==========================================
// ROLE -> PERMISSION MAPPINGS
// ==========================================

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  // Super Admin: Has wildcard access to everything
  [ROLES.SUPER_ADMIN]: [PERMISSIONS.ALL],

  // Tenant Admin: Full org management, no org delete
  [ROLES.TENANT_ADMIN]: [
    // Organization
    PERMISSIONS.ORG_READ,
    PERMISSIONS.ORG_MANAGE,
    // Users
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_INVITE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_DISABLE,
    // Roles
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.ROLES_ASSIGN,
    // Clients
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.CLIENTS_DELETE,
    PERMISSIONS.CLIENTS_MANAGE,
    // Sessions
    PERMISSIONS.SESSIONS_READ,
    PERMISSIONS.SESSIONS_REVOKE,
    PERMISSIONS.SESSIONS_DELETE,
    // MFA
    PERMISSIONS.MFA_READ,
    PERMISSIONS.MFA_MANAGE,
    // Logs
    PERMISSIONS.LOGS_READ,
    PERMISSIONS.AUDIT_READ,
    // Analytics
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_SECURITY,
    // Security Overview
    PERMISSIONS.SECURITY_OVERVIEW_READ,
    // Settings
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.SETTINGS_MANAGE,
    // Billing
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_MANAGE,
    // Fingerprinting
    PERMISSIONS.FINGERPRINTING_READ,
    PERMISSIONS.FINGERPRINTING_WRITE,
    // Data Export
    PERMISSIONS.DATA_EXPORT,
    // Workflows
    PERMISSIONS.WORKFLOWS_MANAGE,
    // Profile
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
  ],

  // Security Admin: Security operations only
  [ROLES.SECURITY_ADMIN]: [
    // Organization (read only)
    PERMISSIONS.ORG_READ,
    // Users (view, invite, update, and disable)
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_INVITE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DISABLE,
    // Roles (read only)
    PERMISSIONS.ROLES_READ,
    // Clients (read only)
    PERMISSIONS.CLIENTS_READ,
    // Sessions (full)
    PERMISSIONS.SESSIONS_READ,
    PERMISSIONS.SESSIONS_REVOKE,
    PERMISSIONS.SESSIONS_DELETE,
    // MFA
    PERMISSIONS.MFA_READ,
    PERMISSIONS.MFA_MANAGE,
    // Logs
    PERMISSIONS.LOGS_READ,
    PERMISSIONS.AUDIT_READ,
    // Analytics
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_SECURITY,
    // Settings (read only)
    PERMISSIONS.SETTINGS_READ,
    // Fingerprinting
    PERMISSIONS.FINGERPRINTING_READ,
    PERMISSIONS.FINGERPRINTING_WRITE,
    // Data Export
    PERMISSIONS.DATA_EXPORT,
    // Profile
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
  ],

  // Developer: Client/app integration
  [ROLES.DEVELOPER]: [
    // Clients
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.CLIENTS_DELETE,
    PERMISSIONS.CLIENTS_MANAGE,
    // Analytics (read only)
    PERMISSIONS.ANALYTICS_READ,
    // Logs (read only)
    PERMISSIONS.LOGS_READ,
    // Profile
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
    // Workflows
    PERMISSIONS.WORKFLOWS_MANAGE,
  ],

  // User: Self-service only
  [ROLES.USER]: [
    // Organization (read only)
    PERMISSIONS.ORG_READ,
    // Self session management
    PERMISSIONS.SESSIONS_READ_SELF,
    // Self MFA management
    PERMISSIONS.MFA_MANAGE_SELF,
    // Profile
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
  ],
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Check if a role name is valid
 */
export function isValidRole(role: string): role is RoleName {
  return VALID_ROLES.includes(role as RoleName);
}

/**
 * Validate multiple roles
 */
export function validateRoles(roles: string[]): {
  valid: boolean;
  invalidRoles: string[];
} {
  const invalidRoles = roles.filter((r) => !isValidRole(r));
  return { valid: invalidRoles.length === 0, invalidRoles };
}

/**
 * Get permissions for a set of roles
 */
export function getPermissionsForRoles(roles: RoleName[]): Permission[] {
  const permissionSet = new Set<Permission>();

  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    for (const perm of rolePerms) {
      permissionSet.add(perm);
    }
  }

  return Array.from(permissionSet);
}

/**
 * Check role hierarchy - returns true if roleA is higher than roleB
 */
export function isHigherRole(roleA: RoleName, roleB: RoleName): boolean {
  const indexA = ROLE_HIERARCHY.indexOf(roleA);
  const indexB = ROLE_HIERARCHY.indexOf(roleB);
  return indexA > indexB;
}

/**
 * Get the highest role from a list of roles
 */
export function getHighestRole(roles: RoleName[]): RoleName {
  if (roles.length === 0) return ROLES.USER;

  return roles.reduce((highest, current) => {
    return isHigherRole(current, highest) ? current : highest;
  }, roles[0]);
}

/**
 * Check if a user with given roles can assign a target role
 * Prevents privilege escalation
 */
export function canAssignRole(
  assignerRoles: RoleName[],
  targetRole: RoleName
): boolean {
  // Super admin can assign anything
  if (assignerRoles.includes(ROLES.SUPER_ADMIN)) {
    return true;
  }

  // Only super_admin can assign super_admin
  if (targetRole === ROLES.SUPER_ADMIN) {
    return false;
  }

  // Tenant admin can assign roles below them
  if (assignerRoles.includes(ROLES.TENANT_ADMIN)) {
    const assignableRoles: RoleName[] = [
      ROLES.SECURITY_ADMIN,
      ROLES.DEVELOPER,
      ROLES.USER,
    ];
    return assignableRoles.includes(targetRole);
  }

  // Other roles cannot assign roles
  return false;
}
