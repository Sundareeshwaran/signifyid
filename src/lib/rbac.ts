/**
 * RBAC (Role-Based Access Control) System
 *
 * This module defines the role hierarchy and permissions for Signify iD.
 * Roles are hierarchical, with super_admin having the most permissions.
 */

// ==========================================
// TYPES
// ==========================================

export type Role =
  | "super_admin"
  | "tenant_admin"
  | "security_admin"
  | "developer"
  | "user";

export type Permission =
  // Organization
  | "org:read"
  | "org:manage"
  | "org:delete"
  // Users
  | "users:read"
  | "users:create"
  | "users:invite"
  | "users:update"
  | "users:delete"
  | "users:disable"
  // Roles
  | "roles:read"
  | "roles:assign"
  | "roles:manage"
  // Clients
  | "clients:read"
  | "clients:create"
  | "clients:update"
  | "clients:delete"
  | "clients:manage"
  // Sessions
  | "sessions:read"
  | "sessions:read:self"
  | "sessions:revoke"
  | "sessions:delete"
  // MFA
  | "mfa:read"
  | "mfa:manage"
  | "mfa:manage:self"
  // Logs
  | "logs:read"
  | "audit:read"
  // Analytics
  | "analytics:read"
  | "analytics:security"
  // Security Overview
  | "security:overview"
  // Settings
  | "settings:read"
  | "settings:update"
  | "settings:manage"
  // Billing
  | "billing:read"
  | "billing:manage"
  // Profile
  | "profile:read"
  | "profile:update"
  // Fingerprinting
  | "fingerprinting:read"
  | "fingerprinting:write"
  // Data Export
  | "data:export"
  // Workflows
  | "workflows:manage";

// ==========================================
// ROLE PERMISSIONS
// ==========================================

const ROLE_PERMISSIONS: Record<Role, (Permission | "*")[]> = {
  super_admin: ["*"],
  tenant_admin: [
    "org:read",
    "org:manage",
    "users:read",
    "users:invite",
    "users:update",
    "users:delete",
    "users:disable",
    "roles:read",
    "roles:assign",
    "clients:read",
    "clients:create",
    "clients:update",
    "clients:delete",
    "clients:manage",
    "sessions:read",
    "sessions:revoke",
    "sessions:delete",
    "mfa:read",
    "mfa:manage",
    "logs:read",
    "audit:read",
    "analytics:read",
    "analytics:security",
    "security:overview",
    "settings:read",
    "settings:update",
    "settings:manage",
    "billing:read",
    "billing:manage",
    "fingerprinting:read",
    "fingerprinting:write",
    "data:export",
    "profile:read",
    "profile:update",
    "workflows:manage",
  ],
  security_admin: [
    "org:read",
    "users:read",
    "users:invite",
    "users:update",
    "users:disable",
    "roles:read",
    "clients:read",
    "sessions:read",
    "sessions:revoke",
    "sessions:delete",
    "mfa:read",
    "mfa:manage",
    "logs:read",
    "audit:read",
    "analytics:read",
    "analytics:security",
    "security:overview",
    "settings:read",
    "fingerprinting:read",
    "fingerprinting:write",
    "data:export",
    "profile:read",
    "profile:update",
  ],
  developer: [
    "clients:read",
    "clients:create",
    "clients:update",
    "clients:delete",
    "clients:manage",
    "analytics:read",
    "logs:read",
    "profile:read",
    "profile:update",
    "workflows:manage",
  ],
  user: [
    "org:read",
    "sessions:read:self",
    "mfa:manage:self",
    "profile:read",
    "profile:update",
  ],
};

// ==========================================
// NAVIGATION
// ==========================================

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  requiredPermissions: Permission[];
  group: "overview" | "security" | "activity" | "billing" | "settings";
}

export const NAVIGATION_ITEMS: NavItem[] = [
  // Overview
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    requiredPermissions: [],
    group: "overview",
  },
  {
    id: "profile",
    label: "Profile",
    href: "/dashboard/profile",
    icon: "User",
    requiredPermissions: [],
    group: "overview",
  },
  // Security
  {
    id: "users",
    label: "Users",
    href: "/dashboard/users",
    icon: "Users",
    requiredPermissions: ["users:read"],
    group: "security",
  },
  {
    id: "clients",
    label: "Applications",
    href: "/dashboard/clients",
    icon: "AppWindow",
    requiredPermissions: ["clients:read"],
    group: "security",
  },
  {
    id: "workflows",
    label: "Workflows",
    href: "/dashboard/workflows",
    icon: "Workflow",
    requiredPermissions: ["workflows:manage"],
    group: "security",
  },
  {
    id: "roles",
    label: "Roles & Permissions",
    href: "/dashboard/roles",
    icon: "Shield",
    requiredPermissions: ["roles:read"],
    group: "security",
  },
  {
    id: "fingerprinting",
    label: "Fingerprinting",
    href: "/dashboard/fingerprinting",
    icon: "Fingerprint",
    requiredPermissions: ["fingerprinting:read"],
    group: "security",
  },
  // Activity & Logs
  {
    id: "sessions",
    label: "Sessions",
    href: "/dashboard/sessions",
    icon: "Monitor",
    requiredPermissions: ["sessions:read", "sessions:read:self"],
    group: "activity",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: "BarChart3",
    requiredPermissions: ["analytics:read"],
    group: "activity",
  },
  {
    id: "logs",
    label: "Audit Logs",
    href: "/dashboard/logs",
    icon: "FileText",
    requiredPermissions: ["logs:read"],
    group: "activity",
  },
  // Billing
  {
    id: "billing",
    label: "Billing & Plans",
    href: "/dashboard/billing",
    icon: "CreditCard",
    requiredPermissions: ["billing:read"],
    group: "billing",
  },
  // Settings
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: "Settings",
    requiredPermissions: ["settings:read"],
    group: "settings",
  },
];

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;

  // Wildcard grants all
  if (rolePerms.includes("*")) return true;

  return rolePerms.includes(permission);
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions
 */
export function hasAnyPermission(
  role: Role,
  permissions: Permission[]
): boolean {
  if (permissions.length === 0) return true;
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: Role): (Permission | "*")[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Get navigation items visible to a specific role
 */
export function getVisibleNavItems(role: Role): NavItem[] {
  return NAVIGATION_ITEMS.filter((item) =>
    hasAnyPermission(role, item.requiredPermissions)
  );
}

/**
 * Get navigation items grouped by category for a role
 */
export function getGroupedNavItems(role: Role): Record<string, NavItem[]> {
  const visibleItems = getVisibleNavItems(role);
  return visibleItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);
}

// ==========================================
// DISPLAY HELPERS
// ==========================================

export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  super_admin: "Super Admin",
  tenant_admin: "Tenant Admin",
  security_admin: "Security Admin",
  developer: "Developer",
  user: "User",
};

export const ROLE_BADGE_VARIANTS: Record<
  Role,
  "default" | "secondary" | "destructive" | "outline"
> = {
  super_admin: "destructive",
  tenant_admin: "default",
  security_admin: "secondary",
  developer: "outline",
  user: "outline",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin:
    "Full system access, can manage all tenants and delete organizations",
  tenant_admin:
    "Full access within their organization, can manage users and settings",
  security_admin: "Can manage security settings, view sessions, and manage MFA",
  developer: "Can manage OAuth clients and view analytics",
  user: "Basic authenticated user with self-service capabilities",
};

/**
 * Get the primary role from a list of roles, prioritizing higher privileges.
 */
export function getPrimaryRole(roles: string[]): Role {
  if (!roles || roles.length === 0) return "user";

  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("tenant_admin")) return "tenant_admin";
  if (roles.includes("security_admin")) return "security_admin";
  if (roles.includes("developer")) return "developer";

  // Check if first role is a valid role
  const firstRole = roles[0];
  if (
    firstRole === "super_admin" ||
    firstRole === "tenant_admin" ||
    firstRole === "security_admin" ||
    firstRole === "developer" ||
    firstRole === "user"
  ) {
    return firstRole;
  }

  return "user";
}
