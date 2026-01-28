"use client";

/**
 * Client Auth Provider
 *
 * React context provider for managing client authentication state.
 * Provides session info, authentication status, and auth actions
 * to all child components.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter, usePathname } from "next/navigation";

interface ClientSession {
  session_id: string;
  domain: string;
  expires_at: string;
  client_id: string;
}

interface ClientAuthContextValue {
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

const ClientAuthContext = createContext<ClientAuthContextValue | undefined>(
  undefined,
);

interface ClientAuthProviderProps {
  children: React.ReactNode;
  /** API base URL */
  apiUrl?: string;
  /** Login page path */
  loginPath?: string;
  /** Paths that don't require authentication */
  publicPaths?: string[];
  /** Whether to auto-check auth on mount */
  autoCheck?: boolean;
  /** Revalidation interval in ms (0 = disabled) */
  revalidateInterval?: number;
}

export function ClientAuthProvider({
  children,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  loginPath = "/client/login",
  publicPaths = ["/client/login", "/client/register", "/"],
  autoCheck = true,
  revalidateInterval = 0,
}: ClientAuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<ClientSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if current path is public
  const isPublicPath = useMemo(() => {
    return publicPaths.some(
      (path) => pathname === path || pathname.startsWith(path + "/"),
    );
  }, [pathname, publicPaths]);

  // Validate session with backend
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
      console.error("[ClientAuthProvider] Session validation error:", err);
      setSession(null);
      setIsAuthenticated(false);
      setError("Failed to validate session");
      return false;
    }
  }, [apiUrl]);

  // Revalidate function exposed to consumers
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
      console.error("[ClientAuthProvider] Logout error:", err);
    }

    setSession(null);
    setIsAuthenticated(false);
    setError(null);

    // Build login URL with current location for return
    const currentUrl =
      typeof window !== "undefined" ? window.location.href : "";
    const loginUrl = new URL(loginPath, window.location.origin);
    if (currentUrl && !isPublicPath) {
      loginUrl.searchParams.set("redirect", currentUrl);
    }
    router.push(loginUrl.toString());
  }, [apiUrl, loginPath, router, isPublicPath]);

  // Initial auth check
  useEffect(() => {
    if (!autoCheck) {
      void (async () => {
        setIsLoading(false);
      })();
      return;
    }

    async function checkAuth() {
      // Skip auth check for public paths
      if (isPublicPath) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await validateSession();
      setIsLoading(false);
    }

    checkAuth();
  }, [autoCheck, isPublicPath, validateSession]);

  // Periodic revalidation
  useEffect(() => {
    if (revalidateInterval <= 0 || !isAuthenticated) {
      return;
    }

    const interval = setInterval(async () => {
      const stillValid = await validateSession();
      if (!stillValid && !isPublicPath) {
        const loginUrl = new URL(loginPath, window.location.origin);
        loginUrl.searchParams.set("redirect", window.location.href);
        loginUrl.searchParams.set("error", "session_expired");
        router.push(loginUrl.toString());
      }
    }, revalidateInterval);

    return () => clearInterval(interval);
  }, [
    revalidateInterval,
    isAuthenticated,
    validateSession,
    loginPath,
    router,
    isPublicPath,
  ]);

  const value: ClientAuthContextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      session,
      error,
      revalidate,
      logout,
    }),
    [isAuthenticated, isLoading, session, error, revalidate, logout],
  );

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
}

/**
 * Hook to access client auth context
 */
export function useClientAuth(): ClientAuthContextValue {
  const context = useContext(ClientAuthContext);

  if (context === undefined) {
    throw new Error("useClientAuth must be used within a ClientAuthProvider");
  }

  return context;
}

export default ClientAuthProvider;
