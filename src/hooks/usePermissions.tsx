"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { authApi } from "@/lib/api";

interface PermissionContextType {
  permissions: string[];
  roles: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: [],
  roles: [],
  loading: true,
  error: null,
  refresh: async () => {},
});

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await authApi.me();

      if (result.error) {
        setError(result.error);
        setPermissions([]);
        setRoles([]);
      } else if (result.data) {
        setPermissions(result.data.permissions || []);
        setRoles(result.data.roles || []);
      }
    } catch (err) {
      setError("Failed to fetch permissions");
      setPermissions([]);
      setRoles([]);
    }

    setLoading(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    void (async () => {
      fetchPermissions();
    })();
  }, [fetchPermissions]);

  // Refresh on visibility change (when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchPermissions();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchPermissions]);

  // Refresh on focus (belt-and-suspenders with visibility)
  useEffect(() => {
    const handleFocus = () => {
      fetchPermissions();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchPermissions]);

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        roles,
        loading,
        error,
        refresh: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook to access permissions and check access
 */
export function usePermissions() {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error("usePermissions must be used within PermissionProvider");
  }

  const { permissions, roles, loading, error, refresh } = context;

  /**
   * Check if user has a specific permission
   * Supports wildcard (*) for super_admin
   */
  const can = useCallback(
    (permission: string): boolean => {
      // Wildcard grants all access
      if (permissions.includes("*")) {
        return true;
      }

      // Direct permission check
      if (permissions.includes(permission)) {
        return true;
      }

      // Check for resource-level wildcard
      const [resource] = permission.split(":");
      if (permissions.includes(`${resource}:*`)) {
        return true;
      }

      return false;
    },
    [permissions]
  );

  /**
   * Check if user has ANY of the specified permissions
   */
  const canAny = useCallback(
    (...perms: string[]): boolean => {
      if (perms.length === 0) return true;
      return perms.some((p) => can(p));
    },
    [can]
  );

  /**
   * Check if user has ALL of the specified permissions
   */
  const canAll = useCallback(
    (...perms: string[]): boolean => {
      if (perms.length === 0) return true;
      return perms.every((p) => can(p));
    },
    [can]
  );

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      return roles.includes(role);
    },
    [roles]
  );

  /**
   * Check if user is super_admin
   */
  const isSuperAdmin = roles.includes("super_admin");

  /**
   * Check if user is tenant_admin or higher
   */
  const isAdmin =
    roles.includes("super_admin") || roles.includes("tenant_admin");

  return {
    permissions,
    roles,
    loading,
    error,
    refresh,
    can,
    canAny,
    canAll,
    hasRole,
    isSuperAdmin,
    isAdmin,
  };
}
