"use client";

/**
 * Permission Gate
 *
 * Conditionally renders children based on user permissions.
 * Supports single permission, multiple permissions (any/all),
 * and optional fallback content.
 */
import { ReactNode } from "react";
import { usePermissions } from "@/components/providers/permission-context";

interface PermissionGateProps {
  /** Single permission to check */
  permission?: string;
  /** Multiple permissions - user must have at least one (unless requireAll is true) */
  permissions?: string[];
  /** If true, user must have ALL permissions instead of just one */
  requireAll?: boolean;
  /** Content to render if permission check fails */
  fallback?: ReactNode;
  /** Children to render if permission check passes */
  children: ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Shows children only if user has the permission
 */
export function Can({
  do: permission,
  children,
  fallback = null,
}: {
  do: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGate permission={permission} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Shows children only if user does NOT have the permission
 */
export function Cannot({
  do: permission,
  children,
}: {
  do: string;
  children: ReactNode;
}) {
  const { hasPermission } = usePermissions();

  if (hasPermission(permission)) {
    return null;
  }

  return <>{children}</>;
}
