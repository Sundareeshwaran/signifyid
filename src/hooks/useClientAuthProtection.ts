/**
 * useClientAuthProtection Hook
 *
 * React hook for protecting routes with Signify iD client authentication.
 * Automatically redirects unauthenticated users to login.
 *
 * Usage:
 * ```tsx
 * import { useClientAuthProtection } from '@/hooks/useClientAuthProtection';
 *
 * export default function ProtectedPage() {
 *   const { isAuthenticated, isLoading, session } = useClientAuthProtection({
 *     redirectTo: '/client/login'
 *   });
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!isAuthenticated) return null; // Will redirect
 *
 *   return <div>Protected Content</div>;
 * }
 * ```
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

interface ClientSession {
  session_id: string;
  domain: string;
  expires_at: string;
  client_id: string;
}

interface UseClientAuthProtectionOptions {
  /** URL to redirect to if not authenticated (default: /client/login) */
  redirectTo?: string;

  /** API base URL (default: http://localhost:5000) */
  apiUrl?: string;

  /** Paths that don't require authentication */
  publicPaths?: string[];

  /** Skip automatic redirect (useful for conditional protection) */
  skipRedirect?: boolean;

  /** Called when authentication check completes */
  onAuthChecked?: (isAuthenticated: boolean) => void;
}

interface UseClientAuthProtectionReturn {
  /** Whether user is authenticated */
  isAuthenticated: boolean;

  /** Whether auth check is in progress */
  isLoading: boolean;

  /** Session data if authenticated */
  session: ClientSession | null;

  /** Any error that occurred */
  error: string | null;

  /** Manually re-check authentication */
  revalidate: () => Promise<void>;

  /** Logout and redirect to login */
  logout: () => Promise<void>;
}

const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Protects client routes by verifying session authentication and handling redirects to the client login page.
 *
 * @param options - Configuration for the protection behavior:
 *   - `redirectTo` — URL to send unauthenticated users (default: `/client/login`).
 *   - `apiUrl` — base API URL used for validation and logout (default: `NEXT_PUBLIC_API_URL` or `http://localhost:5000/api`); trailing slashes are removed.
 *   - `publicPaths` — array of paths that do not require authentication (default: [`/client/login`, `/client/register`, `/`]).
 *   - `skipRedirect` — when true, prevent automatic redirect for unauthenticated users.
 *   - `onAuthChecked` — optional callback invoked with the boolean authentication result after a check.
 * @returns An object with:
 *   - `isAuthenticated` — `true` if a valid client session exists, `false` otherwise.
 *   - `isLoading` — `true` while an authentication check is in progress.
 *   - `session` — the current `ClientSession` object when authenticated, or `null`.
 *   - `error` — an error message when validation fails, or `null`.
 *   - `revalidate` — function to re-check the session immediately.
 *   - `logout` — function that attempts server logout, clears session state, and redirects to the login page with `redirect_uri`.
 */
export function useClientAuthProtection(
  options: UseClientAuthProtectionOptions = {},
): UseClientAuthProtectionReturn {
  const {
    redirectTo = "/client/login",
    apiUrl: rawApiUrl = DEFAULT_API_URL,
    publicPaths = ["/client/login", "/client/register", "/"],
    skipRedirect = false,
    onAuthChecked,
  } = options;

  // Normalize API URL - remove trailing slashes to prevent double-slash issues
  const apiUrl = rawApiUrl.replace(/\/+$/, "");

  const router = useRouter();
  const pathname = usePathname();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<ClientSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if current path is public
  const isPublicPath = useCallback(() => {
    return publicPaths.some(
      (path) => pathname === path || pathname.startsWith(path + "/"),
    );
  }, [pathname, publicPaths]);

  // Validate session against API
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${apiUrl}/client-auth/session/validate`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.valid) {
        setSession({
          session_id: data.session_id,
          domain: data.domain,
          expires_at: data.expires_at,
          client_id: data.client_id,
        });
        setIsAuthenticated(true);
        setError(null);
        return true;
      } else {
        setSession(null);
        setIsAuthenticated(false);
        setError(data.error || "Not authenticated");
        return false;
      }
    } catch (err) {
      console.error("Session validation error:", err);
      setSession(null);
      setIsAuthenticated(false);
      setError("Failed to validate session");
      return false;
    }
  }, [apiUrl]);

  // Revalidate function exposed to component
  const revalidate = useCallback(async () => {
    setIsLoading(true);
    await validateSession();
    setIsLoading(false);
  }, [validateSession]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch(`${apiUrl}/client-auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }

    setSession(null);
    setIsAuthenticated(false);

    // Build redirect URL with return path
    const currentUrl =
      typeof window !== "undefined" ? window.location.href : "";
    const loginUrl = new URL(redirectTo, window.location.origin);
    loginUrl.searchParams.set("redirect_uri", currentUrl);
    router.push(loginUrl.toString());
  }, [apiUrl, redirectTo, router]);

  // Main authentication check effect
  useEffect(() => {
    async function checkAuth() {
      // Skip for public paths
      if (isPublicPath()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const isValid = await validateSession();
      setIsLoading(false);

      // Call callback if provided
      onAuthChecked?.(isValid);

      // Redirect if not authenticated and redirect is enabled
      if (!isValid && !skipRedirect) {
        const currentUrl =
          typeof window !== "undefined" ? window.location.href : "";
        const loginUrl = new URL(redirectTo, window.location.origin);
        loginUrl.searchParams.set("redirect_uri", currentUrl);
        router.push(loginUrl.toString());
      }
    }

    checkAuth();
  }, [
    pathname,
    isPublicPath,
    validateSession,
    skipRedirect,
    redirectTo,
    router,
    onAuthChecked,
  ]);

  return {
    isAuthenticated,
    isLoading,
    session,
    error,
    revalidate,
    logout,
  };
}

export default useClientAuthProtection;