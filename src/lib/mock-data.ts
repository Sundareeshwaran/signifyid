/**
 * Mock Data Layer
 * 
 * Provides realistic mock data for the MVP demo.
 * In production, this would be replaced with API calls.
 */

import { User, Organization, OAuthClient } from './auth';
import { Role, Permission } from './rbac';

// Mock Users
export const MOCK_USERS: User[] = [
  {
    id: 'user_01',
    email: 'admin@acme.com',
    name: 'John Admin',
    role: 'tenant_admin',
    organizationId: 'org_01',
    mfaEnabled: true,
    emailVerified: true,
    createdAt: '2024-01-15T10:00:00Z',
    lastLoginAt: '2024-12-14T08:30:00Z',
  },
  {
    id: 'user_02',
    email: 'security@acme.com',
    name: 'Sarah Security',
    role: 'security_admin',
    organizationId: 'org_01',
    mfaEnabled: true,
    emailVerified: true,
    createdAt: '2024-02-01T09:00:00Z',
    lastLoginAt: '2024-12-13T14:20:00Z',
  },
  {
    id: 'user_03',
    email: 'dev@acme.com',
    name: 'Mike Developer',
    role: 'developer',
    organizationId: 'org_01',
    mfaEnabled: false,
    emailVerified: true,
    createdAt: '2024-03-10T11:30:00Z',
    lastLoginAt: '2024-12-14T09:15:00Z',
  },
  {
    id: 'user_04',
    email: 'jane@acme.com',
    name: 'Jane Smith',
    role: 'user',
    organizationId: 'org_01',
    mfaEnabled: true,
    emailVerified: true,
    createdAt: '2024-04-20T15:00:00Z',
    lastLoginAt: '2024-12-12T16:45:00Z',
  },
  {
    id: 'user_05',
    email: 'bob@acme.com',
    name: 'Bob Wilson',
    role: 'user',
    organizationId: 'org_01',
    mfaEnabled: false,
    emailVerified: false,
    createdAt: '2024-05-05T08:00:00Z',
    lastLoginAt: '2024-12-10T10:00:00Z',
  },
  {
    id: 'user_06',
    email: 'alice@acme.com',
    name: 'Alice Johnson',
    role: 'developer',
    organizationId: 'org_01',
    mfaEnabled: true,
    emailVerified: true,
    createdAt: '2024-06-15T12:00:00Z',
    lastLoginAt: '2024-12-14T07:00:00Z',
  },
];

// Mock Organization
export const MOCK_ORGANIZATION: Organization = {
  id: 'org_01',
  name: 'Acme Corporation',
  domain: 'acme.com',
  logo: undefined,
  plan: 'pro',
  createdAt: '2024-01-01T00:00:00Z',
};

// Mock OAuth Clients (OIDC Applications)
export const MOCK_CLIENTS: OAuthClient[] = [
  {
    id: 'client_01',
    clientId: 'client_abc123def456ghi789',
    name: 'Acme Web Portal',
    description: 'Main customer-facing web application',
    redirectUris: ['https://portal.acme.com/callback', 'https://portal.acme.com/silent-renew'],
    scopes: ['openid', 'profile', 'email'],
    grantTypes: ['authorization_code', 'refresh_token'],
    createdAt: '2024-01-10T10:00:00Z',
    createdBy: 'user_03',
    isActive: true,
  },
  {
    id: 'client_02',
    clientId: 'client_xyz789abc123def456',
    name: 'Mobile App',
    description: 'iOS and Android mobile application',
    redirectUris: ['acme://callback', 'https://acme.com/mobile/callback'],
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    grantTypes: ['authorization_code', 'refresh_token'],
    createdAt: '2024-02-15T14:30:00Z',
    createdBy: 'user_03',
    isActive: true,
  },
  {
    id: 'client_03',
    clientId: 'client_service_backend_api',
    name: 'Backend API Service',
    description: 'Internal microservices authentication',
    redirectUris: [],
    scopes: ['openid'],
    grantTypes: ['client_credentials'],
    createdAt: '2024-03-01T09:00:00Z',
    createdBy: 'user_01',
    isActive: true,
  },
  {
    id: 'client_04',
    clientId: 'client_partner_integration',
    name: 'Partner Integration',
    description: 'Third-party partner SSO integration',
    redirectUris: ['https://partner.example.com/auth/callback'],
    scopes: ['openid', 'profile'],
    grantTypes: ['authorization_code'],
    createdAt: '2024-04-20T11:00:00Z',
    createdBy: 'user_06',
    isActive: false,
  },
];

// Mock Roles with Permission Definitions
export interface RoleDefinition {
  id: Role;
  name: string;
  description: string;
  permissions: Permission[];
  userCount: number;
}

export const MOCK_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full system access across all organizations',
    permissions: [
      'users:read', 'users:create', 'users:update', 'users:delete',
      'clients:read', 'clients:create', 'clients:update', 'clients:delete',
      'roles:read', 'roles:manage',
      'logs:read',
      'billing:read', 'billing:manage',
      'org:read', 'org:manage',
    ],
    userCount: 0,
  },
  {
    id: 'tenant_admin',
    name: 'Organization Admin',
    description: 'Full access within the organization',
    permissions: [
      'users:read', 'users:create', 'users:update', 'users:delete',
      'clients:read', 'clients:create', 'clients:update', 'clients:delete',
      'roles:read', 'roles:manage',
      'logs:read',
      'billing:read', 'billing:manage',
      'org:read', 'org:manage',
    ],
    userCount: 1,
  },
  {
    id: 'security_admin',
    name: 'Security Admin',
    description: 'Manage security settings and user access',
    permissions: [
      'users:read', 'users:create', 'users:update',
      'clients:read',
      'roles:read',
      'logs:read',
      'org:read',
    ],
    userCount: 1,
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Create and manage OAuth applications',
    permissions: [
      'clients:read', 'clients:create', 'clients:update',
      'logs:read',
    ],
    userCount: 2,
  },
  {
    id: 'user',
    name: 'User',
    description: 'Basic authenticated user access',
    permissions: ['org:read'],
    userCount: 2,
  },
];

// Mock Activity Log
export interface ActivityLogEntry {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  ipAddress: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

export const MOCK_ACTIVITY_LOG: ActivityLogEntry[] = [
  {
    id: 'log_01',
    action: 'user.login',
    description: 'User logged in successfully',
    userId: 'user_01',
    userName: 'John Admin',
    ipAddress: '192.168.1.100',
    timestamp: '2024-12-14T08:30:00Z',
    status: 'success',
  },
  {
    id: 'log_02',
    action: 'user.mfa_verified',
    description: 'MFA verification completed',
    userId: 'user_01',
    userName: 'John Admin',
    ipAddress: '192.168.1.100',
    timestamp: '2024-12-14T08:30:15Z',
    status: 'success',
  },
  {
    id: 'log_03',
    action: 'client.created',
    description: 'New OAuth client created: Mobile App',
    userId: 'user_03',
    userName: 'Mike Developer',
    ipAddress: '192.168.1.105',
    timestamp: '2024-12-13T16:45:00Z',
    status: 'success',
  },
  {
    id: 'log_04',
    action: 'user.login_failed',
    description: 'Login attempt failed - invalid password',
    userId: 'user_05',
    userName: 'Bob Wilson',
    ipAddress: '203.0.113.42',
    timestamp: '2024-12-13T14:20:00Z',
    status: 'error',
  },
  {
    id: 'log_05',
    action: 'user.password_reset',
    description: 'Password reset requested',
    userId: 'user_04',
    userName: 'Jane Smith',
    ipAddress: '192.168.1.110',
    timestamp: '2024-12-12T10:00:00Z',
    status: 'warning',
  },
];

// Dashboard Stats
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalClients: number;
  activeClients: number;
  loginSuccess: number;
  loginFailures: number;
  mfaEnabled: number;
}

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalUsers: MOCK_USERS.length,
  activeUsers: MOCK_USERS.filter(u => u.emailVerified).length,
  totalClients: MOCK_CLIENTS.length,
  activeClients: MOCK_CLIENTS.filter(c => c.isActive).length,
  loginSuccess: 1247,
  loginFailures: 23,
  mfaEnabled: MOCK_USERS.filter(u => u.mfaEnabled).length,
};
