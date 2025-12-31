"use client";

import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PermissionGuardProps {
  /** Permission(s) required - user needs ANY of these */
  requires?: string | string[];
  /** Permission(s) required - user needs ALL of these */
  requiresAll?: string[];
  /** Role(s) required - user needs ANY of these */
  requiresRole?: string | string[];
  /** Content to show when authorized */
  children: ReactNode;
  /** Custom fallback when unauthorized */
  fallback?: ReactNode;
  /** Show loading state while checking permissions */
  showLoading?: boolean;
}

/**
 * Default access denied component
 */
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        You don&apos;t have permission to access this resource. Please contact
        your administrator if you believe this is an error.
      </p>
      <Button asChild>
        <Link href="/dashboard">Return to Dashboard</Link>
      </Button>
    </div>
  );
}

/**
 * Default loading component
 */
function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * PermissionGuard - Protects content based on permissions/roles
 *
 * Usage:
 * ```tsx
 * <PermissionGuard requires="users:read">
 *   <UsersTable />
 * </PermissionGuard>
 *
 * <PermissionGuard requires={["users:read", "users:create"]} requiresAll>
 *   <UserManagement />
 * </PermissionGuard>
 *
 * <PermissionGuard requiresRole="super_admin">
 *   <AdminPanel />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  requires,
  requiresAll,
  requiresRole,
  children,
  fallback,
  showLoading = true,
}: PermissionGuardProps) {
  const { can, canAny, canAll, hasRole, loading } = usePermissions();

  // Show loading state
  if (loading && showLoading) {
    return <LoadingState />;
  }

  // Check role requirement
  if (requiresRole) {
    const roles = Array.isArray(requiresRole) ? requiresRole : [requiresRole];
    const hasRequiredRole = roles.some((r) => hasRole(r));
    if (!hasRequiredRole) {
      return <>{fallback ?? <AccessDenied />}</>;
    }
  }

  // Check "requires any" permissions
  if (requires) {
    const perms = Array.isArray(requires) ? requires : [requires];
    if (!canAny(...perms)) {
      return <>{fallback ?? <AccessDenied />}</>;
    }
  }

  // Check "requires all" permissions
  if (requiresAll && requiresAll.length > 0) {
    if (!canAll(...requiresAll)) {
      return <>{fallback ?? <AccessDenied />}</>;
    }
  }

  return <>{children}</>;
}

/**
 * CanShow - Conditionally renders content based on permissions
 * Does NOT show a fallback, just hides content
 *
 * Usage:
 * ```tsx
 * <CanShow if="users:create">
 *   <Button>Create User</Button>
 * </CanShow>
 * ```
 */
interface CanShowProps {
  /** Permission to check */
  if: string | string[];
  /** Check if user has ALL permissions (default: any) */
  all?: boolean;
  children: ReactNode;
}

export function CanShow({
  if: permission,
  all = false,
  children,
}: CanShowProps) {
  const { canAny, canAll } = usePermissions();

  const perms = Array.isArray(permission) ? permission : [permission];
  const isAllowed = all ? canAll(...perms) : canAny(...perms);

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}

/**
 * RoleGuard - Protects content based on role
 *
 * Usage:
 * ```tsx
 * <RoleGuard role="super_admin">
 *   <SuperAdminPanel />
 * </RoleGuard>
 * ```
 */
interface RoleGuardProps {
  role: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ role, children, fallback }: RoleGuardProps) {
  const { hasRole, loading } = usePermissions();

  if (loading) {
    return <LoadingState />;
  }

  const roles = Array.isArray(role) ? role : [role];
  const hasRequiredRole = roles.some((r) => hasRole(r));

  if (!hasRequiredRole) {
    return <>{fallback ?? <AccessDenied />}</>;
  }

  return <>{children}</>;
}
