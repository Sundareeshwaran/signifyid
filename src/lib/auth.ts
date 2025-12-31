/**
 * Authentication Utilities
 * 
 * This module provides mock authentication state and utilities.
 * In production, this would integrate with a real auth provider.
 */

import { Role } from './rbac';

// User type representing an authenticated user
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: Role;
  organizationId: string;
  mfaEnabled: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
}

// Organization type
export interface Organization {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

// Session type
export interface Session {
  user: User;
  organization: Organization;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

// OAuth2 Client (OIDC Application)
export interface OAuthClient {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  redirectUris: string[];
  scopes: string[];
  grantTypes: ('authorization_code' | 'refresh_token' | 'client_credentials')[];
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

// Available OAuth2 scopes
export const OAUTH_SCOPES = [
  { id: 'openid', name: 'OpenID', description: 'Access your user ID' },
  { id: 'profile', name: 'Profile', description: 'Access your name and avatar' },
  { id: 'email', name: 'Email', description: 'Access your email address' },
  { id: 'offline_access', name: 'Offline Access', description: 'Access your data while you are not online' },
] as const;

/**
 * Mock current session for demo purposes.
 * In production, this would be fetched from a secure session store.
 */
export function getMockSession(role: Role = 'tenant_admin'): Session {
  return {
    user: {
      id: 'user_01',
      email: 'admin@acme.com',
      name: 'John Admin',
      avatar: undefined,
      role,
      organizationId: 'org_01',
      mfaEnabled: true,
      emailVerified: true,
      createdAt: '2024-01-15T10:00:00Z',
      lastLoginAt: new Date().toISOString(),
    },
    organization: {
      id: 'org_01',
      name: 'Acme Corporation',
      domain: 'acme.com',
      plan: 'pro',
      createdAt: '2024-01-01T00:00:00Z',
    },
    accessToken: 'mock_access_token_xxx',
    refreshToken: 'mock_refresh_token_xxx',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements: min 8 chars, uppercase, lowercase, number
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain an uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain a lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain a number' };
  }
  return { valid: true };
}

/**
 * Generate a mock TOTP code for demo
 */
export function generateMockTOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Verify TOTP code (mock - accepts any 6-digit code for demo)
 */
export function verifyTOTP(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Generate a client ID for OAuth applications
 */
export function generateClientId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'client_';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a client secret for OAuth applications
 */
export function generateClientSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'secret_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
