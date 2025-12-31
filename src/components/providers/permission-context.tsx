"use client";

/**
 * Permission Context
 *
 * React context for permission-based access control.
 * Provides permissions to all child components and
 * utility functions for checking permissions.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";

interface PermissionContextValue {
  /** User's aggregated permissions from all roles */
  permissions: string[];
  /** User's role names */
  roles: string[];
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if user has any of the specified permissions */
  hasAnyPermission: (permissions: string[]) => boolean;
  /** Check if user has all of the specified permissions */
  hasAllPermissions: (permissions: string[]) => boolean;
  /** Shorthand aliases */
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

interface PermissionProviderProps {
  children: ReactNode;
  permissions: string[];
  roles: string[];
}

/**
 * Check if user has a specific permission with wildcard support
 */
function checkPermission(
  userPermissions: string[],
  permission: string
): boolean {
  // Wildcard grants all access
  if (userPermissions.includes("*")) {
    return true;
  }

  // Direct match
  if (userPermissions.includes(permission)) {
    return true;
  }

  // Resource wildcard (e.g., "users:*" matches "users:read")
  const [resource] = permission.split(":");
  if (userPermissions.includes(`${resource}:*`)) {
    return true;
  }

  return false;
}

export function PermissionProvider({
  children,
  permissions,
  roles,
}: PermissionProviderProps) {
  const value = useMemo<PermissionContextValue>(() => {
    const hasPermission = (permission: string) =>
      checkPermission(permissions, permission);

    const hasAnyPermission = (perms: string[]) =>
      perms.length === 0 || perms.some((p) => checkPermission(permissions, p));

    const hasAllPermissions = (perms: string[]) =>
      perms.every((p) => checkPermission(permissions, p));

    return {
      permissions,
      roles,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      // Shorthand aliases
      can: hasPermission,
      canAny: hasAnyPermission,
      canAll: hasAllPermissions,
    };
  }, [permissions, roles]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook to access permission context
 */
export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }

  return context;
}

/**
 * Hook to check a single permission
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

/**
 * Hook to check multiple permissions (any)
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const { hasAnyPermission } = usePermissions();
  return hasAnyPermission(permissions);
}
