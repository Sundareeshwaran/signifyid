/**
 * useAuth Hook
 *
 * Provides authentication state and user information
 */
import { useState, useEffect } from "react";
import { authApi } from "@/lib/api";

interface User {
  id: string;
  email: string;
  displayName: string;
  orgId: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function loadUser() {
      try {
        const result = await authApi.me();

        if (result.error) {
          setState({ user: null, loading: false, error: result.error });
          return;
        }

        if (result.data) {
          setState({
            user: {
              id: result.data.id,
              email: result.data.email,
              displayName: result.data.displayName,
              orgId: result.data.orgId,
              roles: result.data.roles,
              permissions: result.data.permissions,
            },
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        setState({ user: null, loading: false, error: "Failed to load user" });
      }
    }

    loadUser();
  }, []);

  return state;
}
