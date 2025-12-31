"use client";

import { useState, useCallback, useEffect } from "react";
import * as clientAuthApi from "@/lib/api/clientAuthApi";

export interface UseClientAuthResult {
  login: (
    clientId: string,
    clientSecret: string,
    redirectUri?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  getSessionExpiry: () => Date | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export function useClientAuth(): UseClientAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);

  /**
   * Login with client credentials
   */
  const login = useCallback(
    async (clientId: string, clientSecret: string, redirectUri?: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await clientAuthApi.loginClient({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        });

        setIsAuthenticated(true);
        setSessionExpiry(new Date(response.expires_at));

        // If redirect URI provided, navigate to it
        if (response.redirect_uri) {
          window.location.href = response.redirect_uri;
        }
      } catch (err: any) {
        setError(err.message || "Login failed");
        setIsAuthenticated(false);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Logout and revoke session
   */
  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await clientAuthApi.logoutClient();
      setIsAuthenticated(false);
      setSessionExpiry(null);
    } catch (err: any) {
      setError(err.message || "Logout failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validate active session
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await clientAuthApi.validateClientSession();

      if (response.valid && response.expires_at) {
        setIsAuthenticated(true);
        setSessionExpiry(new Date(response.expires_at));
        return true;
      } else {
        setIsAuthenticated(false);
        setSessionExpiry(null);
        return false;
      }
    } catch (err) {
      setIsAuthenticated(false);
      setSessionExpiry(null);
      return false;
    }
  }, []);

  /**
   * Get session expiry time
   */
  const getSessionExpiry = useCallback((): Date | null => {
    return sessionExpiry;
  }, [sessionExpiry]);

  /**
   * Validate session on mount
   */
  useEffect(() => {
    validateSession();
  }, [validateSession]);

  /**
   * Set up expiry warning (5 minutes before expiry)
   */
  useEffect(() => {
    if (!sessionExpiry) return;

    const timeUntilExpiry = sessionExpiry.getTime() - Date.now();
    const timeUntilWarning = timeUntilExpiry - 5 * 60 * 1000; // 5 minutes before

    if (timeUntilWarning > 0) {
      const warningTimer = setTimeout(() => {
        console.warn("Client session will expire in 5 minutes");
        // You can show a toast/alert here
      }, timeUntilWarning);

      return () => clearTimeout(warningTimer);
    }
  }, [sessionExpiry]);

  return {
    login,
    logout,
    validateSession,
    getSessionExpiry,
    isAuthenticated,
    loading,
    error,
  };
}
