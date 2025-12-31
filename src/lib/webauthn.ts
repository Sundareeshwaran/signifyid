/**
 * WebAuthn Client Utilities
 *
 * Client-side utilities for WebAuthn passkey authentication
 */
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Check if WebAuthn is supported in the current browser
 */
export function isWebAuthnSupported(): boolean {
  return browserSupportsWebAuthn();
}

/**
 * Check if user has any registered passkeys
 */
export async function checkPasskeys(email: string): Promise<{
  hasPasskeys: boolean;
  count: number;
}> {
  try {
    const response = await fetch(
      `${API_URL}/auth/webauthn/check/${encodeURIComponent(email)}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      return { hasPasskeys: false, count: 0 };
    }

    return await response.json();
  } catch (error) {
    console.error("Check passkeys error:", error);
    return { hasPasskeys: false, count: 0 };
  }
}

/**
 * Register a new passkey for the current user
 * User must be logged in
 */
export async function registerPasskey(
  deviceName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get registration options from server
    const optionsResponse = await fetch(
      `${API_URL}/auth/webauthn/register/options`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      return { success: false, error: error.error || "Failed to get options" };
    }

    const options = await optionsResponse.json();

    // 2. Start registration with authenticator (shows biometric prompt)
    const credential = await startRegistration({ optionsJSON: options });

    // 3. Verify with server
    const verifyResponse = await fetch(
      `${API_URL}/auth/webauthn/register/verify`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
          deviceName: deviceName || "My Passkey",
        }),
      }
    );

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      return { success: false, error: error.error || "Verification failed" };
    }

    return { success: true };
  } catch (error) {
    console.error("Register passkey error:", error);

    // Handle user cancellation
    if (error instanceof Error && error.name === "NotAllowedError") {
      return { success: false, error: "Registration was cancelled" };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed",
    };
  }
}

/**
 * Login with a passkey
 * Returns user info on success
 */
export async function loginWithPasskey(email: string): Promise<{
  success: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string;
    orgId: string;
  };
  roles?: string[];
  error?: string;
}> {
  try {
    // 1. Get authentication options from server
    const optionsResponse = await fetch(
      `${API_URL}/auth/webauthn/login/options`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    );

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      return { success: false, error: error.error || "Failed to get options" };
    }

    const options = await optionsResponse.json();

    // 2. Authenticate with authenticator (shows biometric prompt)
    const credential = await startAuthentication({ optionsJSON: options });

    // 3. Verify with server
    const verifyResponse = await fetch(
      `${API_URL}/auth/webauthn/login/verify`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, credential }),
      }
    );

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      return { success: false, error: error.error || "Authentication failed" };
    }

    const result = await verifyResponse.json();
    return {
      success: true,
      user: result.user,
      roles: result.roles,
    };
  } catch (error) {
    console.error("Login with passkey error:", error);

    // Handle user cancellation
    if (error instanceof Error && error.name === "NotAllowedError") {
      return { success: false, error: "Authentication was cancelled" };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Get list of registered passkeys for current user
 */
export async function listPasskeys(): Promise<{
  passkeys: Array<{
    id: string;
    deviceName: string;
    createdAt: string;
    lastUsedAt: string | null;
    backedUp: boolean;
  }>;
}> {
  try {
    const response = await fetch(`${API_URL}/auth/webauthn/credentials`, {
      credentials: "include",
    });

    if (!response.ok) {
      return { passkeys: [] };
    }

    return await response.json();
  } catch (error) {
    console.error("List passkeys error:", error);
    return { passkeys: [] };
  }
}

/**
 * Delete a passkey
 */
export async function deletePasskey(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/auth/webauthn/credentials/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to delete" };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete passkey error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete",
    };
  }
}

/**
 * Update passkey device name
 */
export async function updatePasskeyName(
  id: string,
  deviceName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/auth/webauthn/credentials/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceName }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to update" };
    }

    return { success: true };
  } catch (error) {
    console.error("Update passkey error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update",
    };
  }
}
