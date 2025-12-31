/**
 * TypeScript Type Definitions
 */

// User roles
export type Role =
  | "super_admin"
  | "tenant_admin"
  | "security_admin"
  | "developer"
  | "user";

// User status
export type UserStatus = "invited" | "active" | "disabled";

// MFA types
export type MfaType = "totp" | "webauthn" | "sms" | "email";

// Organization
export interface Organization {
  id: string;
  name: string;
  domain: string | null;
  plan: string;
  status?: "active" | "deleted";
  deleted_at?: Date;
  created_at: Date;
}

// User from database
export interface User {
  id: string;
  org_id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  status: UserStatus;
  last_login_at: Date | null;
  created_at: Date;
}

// User with roles (joined)
export interface UserWithRoles extends Omit<User, "password_hash"> {
  roles: string[];
  permissions: string[];
}

// Role
export interface RoleRecord {
  id: string;
  org_id: string;
  name: string;
  permissions: string[];
}

// OAuth Client
export interface OAuthClient {
  id: string;
  org_id: string;
  client_id: string;
  client_secret_hash: string | null;
  redirect_uris: string[];
  scopes: string[];
  created_at: Date;
}

// MFA Method
export interface MfaMethod {
  id: string;
  user_id: string;
  type: MfaType;
  secret: string | null;
  verified: boolean;
  created_at: Date;
}

// Session
export interface Session {
  id: string;
  user_id: string;
  org_id: string;
  client_id: string | null;
  device_info: Record<string, unknown> | null;
  ip_address: string | null;
  mfa_verified: boolean;
  created_at: Date;
  expires_at: Date;
  revoked: boolean;
}

// Token (refresh token record)
export interface Token {
  id: string;
  user_id: string;
  client_id: string | null;
  refresh_token_hash: string;
  issued_at: Date;
  expires_at: Date;
  revoked: boolean;
}

// Audit Log
export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: Date;
}

// JWT Payload
export interface JwtPayload {
  sub: string; // user id
  sessionId: string; // session id (critical for revocation)
  org_id: string;
  email: string;
  display_name?: string | null; // user display name
  roles: string[];
  permissions: string[];
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

// Express Request with user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
