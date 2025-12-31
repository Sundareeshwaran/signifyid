/**
 * Client Auth API Client
 *
 * API functions for client authentication
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface ClientLoginRequest {
  client_id: string;
  client_secret: string;
  redirect_uri?: string;
}

export interface ClientLoginResponse {
  success: boolean;
  session_id: string;
  expires_at: string;
  redirect_uri?: string;
}

export interface ClientSessionValidateResponse {
  valid: boolean;
  session_id?: string;
  domain?: string;
  expires_at?: string;
  client_id?: string;
  error?: string;
  error_description?: string;
}

/**
 * Login client with Client ID + Secret
 */
export async function loginClient(
  data: ClientLoginRequest
): Promise<ClientLoginResponse> {
  const response = await fetch(`${API_BASE}/api/client-auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error_description || "Login failed");
  }

  return response.json();
}

/**
 * Validate active client session
 */
export async function validateClientSession(): Promise<ClientSessionValidateResponse> {
  const response = await fetch(`${API_BASE}/api/client-auth/session/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  return response.json();
}

/**
 * Logout client (revoke session)
 */
export async function logoutClient(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/api/client-auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error_description || "Logout failed");
  }

  return response.json();
}
