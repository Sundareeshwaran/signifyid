/**
 * API Client
 *
 * Centralized API calls to the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Common types used across API responses
export interface ApiUser {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  roles: string[];
  mfaEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface ApiOrganization {
  id: string;
  name: string;
  domain: string;
  plan: string;
  createdAt: string;
}

export interface ApiClient {
  id: string;
  clientId: string;
  name: string;
  redirectUris: string[];
  scopes: string[];
  allowedDomains: string[];
  projectType: "website" | "api" | "internal";
  createdAt: string;
  clientSecret?: string;
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: Array<{ field: string; message: string }>;
}

/**
 * Make an API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: "include", // Include cookies
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Handle 204 No Content (no body to parse)
    if (response.status === 204) {
      return { data: undefined as T };
    }

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Request failed", details: data.details };
    }

    return { data };
  } catch (error) {
    console.error("API request failed:", error);
    return { error: "Network error. Please try again." };
  }
}

// Auth API
export const authApi = {
  register: (body: {
    organizationName: string;
    domain: string;
    email: string;
    password: string;
    name: string;
  }) =>
    apiRequest<{ user: ApiUser; organization: ApiOrganization }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  login: (body: { email: string; password: string }) =>
    apiRequest<{ user: ApiUser | null; mfaRequired: boolean; userId: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  logout: () => apiRequest("/auth/logout", { method: "POST" }),

  refresh: () => apiRequest("/auth/refresh", { method: "POST" }),

  me: () =>
    apiRequest<{
      id: string;
      email: string;
      displayName: string;
      orgId: string;
      roles: string[];
      permissions: string[];
    }>("/auth/me"),

  /** Initiate SSO login - returns redirect URL */
  sso: (email: string) =>
    apiRequest<{ redirectUrl: string }>("/auth/sso", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};

// Users API
export const usersApi = {
  list: (options?: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.status) params.set("status", options.status);
    if (options?.role) params.set("role", options.role);
    if (options?.search) params.set("search", options.search);
    const queryString = params.toString();
    return apiRequest<{
      users: ApiUser[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/users${queryString ? `?${queryString}` : ""}`);
  },

  get: (id: string) => apiRequest<ApiUser>(`/users/${id}`),

  create: (body: {
    email: string;
    password: string;
    displayName: string;
    role_ids?: string[];
  }) =>
    apiRequest<{ message: string; user: ApiUser }>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  invite: (body: { email: string; displayName: string; role_ids?: string[] }) =>
    apiRequest<{
      message: string;
      user: ApiUser;
      inviteToken: string;
      inviteUrl: string;
      expiresAt: string;
    }>("/users/invite", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  activate: (body: { userId: string; password: string }) =>
    apiRequest("/users/activate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  acceptInvite: (body: { token: string; password: string }) =>
    apiRequest<{ message: string; email: string }>("/users/invite/accept", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  validateInviteToken: (token: string) =>
    apiRequest<{
      valid: boolean;
      email: string;
      displayName: string;
      expiresAt: string;
    }>(`/users/invite/validate?token=${encodeURIComponent(token)}`),

  update: (
    id: string,
    body: { displayName?: string; status?: string; role_ids?: string[] }
  ) =>
    apiRequest(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id: string) => apiRequest(`/users/${id}`, { method: "DELETE" }),

  disable: (id: string) =>
    apiRequest(`/users/${id}/disable`, { method: "POST" }),

  enable: (id: string) => apiRequest(`/users/${id}/enable`, { method: "POST" }),

  resetMfa: (id: string) =>
    apiRequest(`/users/${id}/reset-mfa`, { method: "POST" }),

  getProfile: () =>
    apiRequest<{
      id: string;
      email: string;
      displayName: string;
      roles: string[];
      permissions: string[];
      mfaEnabled: boolean;
    }>("/users/me"),

  updateProfile: (body: {
    displayName?: string;
    currentPassword?: string;
    newPassword?: string;
  }) =>
    apiRequest("/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// Clients API
export const clientsApi = {
  list: () => apiRequest<{ clients: ApiClient[] }>("/clients"),

  get: (id: string) => apiRequest<ApiClient>(`/clients/${id}`),

  create: (body: {
    name?: string;
    redirectUris: string[];
    scopes: string[];
    allowedDomains?: string[];
    projectType?: "website" | "api" | "internal";
  }) =>
    apiRequest("/clients", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (
    id: string,
    body: {
      name?: string;
      redirectUris?: string[];
      scopes?: string[];
      allowedDomains?: string[];
      projectType?: "website" | "api" | "internal";
    }
  ) =>
    apiRequest(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id: string) => apiRequest(`/clients/${id}`, { method: "DELETE" }),

  regenerateSecret: (id: string) =>
    apiRequest<{ clientSecret: string }>(`/clients/${id}/regenerate-secret`, {
      method: "POST",
    }),

  disable: (id: string) =>
    apiRequest<{ message: string }>(`/clients/${id}/disable`, {
      method: "POST",
    }),

  enable: (id: string) =>
    apiRequest<{ message: string }>(`/clients/${id}/enable`, {
      method: "POST",
    }),
};

// Fingerprinting API
export const fingerprintingApi = {
  getSettings: () =>
    apiRequest<{
      settings: {
        deviceFingerprint: boolean;
        browserFingerprint: boolean;
        ipRiskAnalysis: boolean;
        geoVelocity: boolean;
        deviceBinding: boolean;
      };
    }>("/fingerprinting/settings"),

  updateSettings: (settings: {
    deviceFingerprint?: boolean;
    browserFingerprint?: boolean;
    ipRiskAnalysis?: boolean;
    geoVelocity?: boolean;
    deviceBinding?: boolean;
  }) =>
    apiRequest("/fingerprinting/settings", {
      method: "PATCH",
      body: JSON.stringify({ settings }),
    }),

  getDevices: () =>
    apiRequest<{
      devices: Array<{
        id: string;
        userId: string;
        userEmail: string;
        userName: string;
        fingerprintHash: string;
        lastSeenIp: string;
        lastSeenAt: string;
        riskScore: number;
        createdAt: string;
      }>;
    }>("/fingerprinting/devices"),

  getRiskEvents: () =>
    apiRequest<{
      riskEvents: Array<{
        id: string;
        userId: string;
        userEmail: string;
        userName: string | null;
        eventType: string;
        features: Record<string, unknown>;
        riskScore: number;
        decision: string;
        createdAt: string;
      }>;
    }>("/fingerprinting/risk-events"),

  getStats: () =>
    apiRequest<{
      stats: {
        trustedDevices: number;
        lowRiskEvents: number;
        mediumRiskEvents: number;
        highRiskEvents: number;
        blockedAttempts: number;
      };
    }>("/fingerprinting/stats"),
};

// Dashboard API
export const dashboardApi = {
  getStats: () =>
    apiRequest<{
      organization: {
        name: string;
        domain: string;
        plan: string;
        createdAt: string;
      };
      users: {
        total: number;
        active: number;
        newThisWeek: number;
      };
      clients: {
        total: number;
      };
      sessions: {
        active: number;
        uniqueUsers: number;
      };
      activity: {
        totalLogs: number;
        logsToday: number;
        logsThisWeek: number;
      };
      security: {
        highRiskEvents: number;
        mediumRiskEvents: number;
        blockedAttempts: number;
        trustedDevices: number;
      };
    }>("/dashboard/stats"),

  getActivity: (limit?: number) =>
    apiRequest<{
      activity: Array<{
        id: string;
        action: string;
        meta: Record<string, unknown>;
        createdAt: string;
        userEmail: string;
        userName: string | null;
      }>;
    }>(`/dashboard/activity${limit ? `?limit=${limit}` : ""}`),
};

// Roles API
export const rolesApi = {
  list: () =>
    apiRequest<{
      roles: Array<{
        id: string;
        name: string;
        description: string | null;
        permissions: string[];
        isSystemRole: boolean;
        createdAt: string;
      }>;
    }>("/roles"),

  get: (id: string) =>
    apiRequest<{
      id: string;
      name: string;
      description: string | null;
      permissions: string[];
      isSystemRole: boolean;
      createdAt: string;
      users: Array<{ id: string; email: string; displayName: string }>;
    }>(`/roles/${id}`),

  create: (body: {
    name: string;
    permissions: string[];
    description?: string;
  }) =>
    apiRequest("/roles", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (
    id: string,
    body: { permissions?: string[]; description?: string }
  ) =>
    apiRequest(`/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id: string) => apiRequest(`/roles/${id}`, { method: "DELETE" }),

  getPermissions: () =>
    apiRequest<{ permissions: string[] }>("/roles/permissions"),

  assignToUser: (roleId: string, userId: string) =>
    apiRequest(`/roles/${roleId}/assign`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  removeFromUser: (roleId: string, userId: string) =>
    apiRequest(`/roles/${roleId}/unassign`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
};

// Analytics API
export const analyticsApi = {
  getOverview: () =>
    apiRequest<{
      users: {
        total: number;
        active: number;
        disabled: number;
        invited: number;
        new7Days: number;
        new30Days: number;
        mfaEnabled: number;
        mfaPercentage: number;
      };
      sessions: {
        active: number;
        uniqueUsers: number;
        byClient: Array<{
          clientName: string;
          clientId: string;
          sessionCount: number;
        }>;
      };
      clients: {
        clients: Array<{
          id: string;
          clientId: string;
          name: string;
          createdAt: string;
          activeTokens: number;
          totalTokens: number;
          logins30d: number;
        }>;
        totalClients: number;
      };
      security: {
        riskEvents: {
          high: number;
          medium: number;
          low: number;
          blocked: number;
        };
        failedLogins: {
          last24h: number;
          last7d: number;
        };
        mfaFailures: number;
      };
      loginTrends: Array<{
        date: string;
        success: number;
        failed: number;
      }>;
    }>("/analytics/overview"),

  getLoginTrends: (days: number = 7) =>
    apiRequest<{
      trends: Array<{
        date: string;
        success: number;
        failed: number;
      }>;
      days: number;
    }>(`/analytics/login-trends?days=${days}`),

  getClientUsage: () =>
    apiRequest<{
      clients: Array<{
        id: string;
        clientId: string;
        name: string;
        createdAt: string;
        activeTokens: number;
        totalTokens: number;
        logins30d: number;
      }>;
      totalClients: number;
    }>("/analytics/client-usage"),

  getSecurity: () =>
    apiRequest<{
      riskEvents: {
        high: number;
        medium: number;
        low: number;
        blocked: number;
      };
      failedLogins: {
        last24h: number;
        last7d: number;
      };
      mfaFailures: number;
    }>("/analytics/security"),

  getLoginActivities: (
    range: "7d" | "30d" | "90d" = "7d",
    groupBy: "day" | "hour" = "day"
  ) =>
    apiRequest<{
      data: Array<{ date: string; count: number }>;
      range: string;
      groupBy: string;
    }>(`/analytics/logins?range=${range}&group_by=${groupBy}`),
};

// Security API
export const securityApi = {
  getOverview: () =>
    apiRequest<{
      highRisk: number;
      mediumRisk: number;
      failedLogins24h: number;
      blockedAttempts: number;
      officeHoursAnomalies: number;
    }>("/security/overview"),
};

// Settings API
export const settingsApi = {
  getOrganization: () =>
    apiRequest<{
      id: string;
      name: string;
      domain: string;
      plan: string;
      createdAt: string;
    }>("/settings/organization"),

  updateOrganization: (data: { name?: string; domain?: string }) =>
    apiRequest<{
      id: string;
      name: string;
      domain: string;
      plan: string;
      createdAt: string;
    }>("/settings/organization", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getSecurity: () =>
    apiRequest<{
      sessionTimeout: number;
      mfaPolicy: string;
      mfaEnabledUsers: number;
      totalUsers: number;
      passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireNumbers: boolean;
        requireSpecial: boolean;
      };
      loginThrottling: boolean;
    }>("/settings/security"),

  updateSecurity: (data: {
    sessionTimeout?: number;
    mfaPolicy?: string;
    loginThrottling?: boolean;
  }) =>
    apiRequest("/settings/security", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getBilling: () =>
    apiRequest<{
      plan: string;
      status: string;
      features: {
        maxUsers: number;
        maxClients: number;
        mfaEnabled: boolean;
        auditLogs: boolean;
        customBranding: boolean;
      };
      usage: {
        users: number;
        clients: number;
      };
    }>("/settings/billing"),
};

// Support API
export const supportApi = {
  contactSales: (data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    organizationName?: string;
  }) =>
    apiRequest<{ success: true; message: string }>("/support/contact", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Organizations API (super_admin only)
export const organizationsApi = {
  get: (orgId: string) =>
    apiRequest<{
      id: string;
      name: string;
      domain: string;
      plan: string;
      status: string;
      createdAt: string;
      deletedAt: string | null;
    }>(`/organizations/${orgId}`),

  delete: (orgId: string, confirmation: string) =>
    apiRequest(`/organizations/${orgId}`, {
      method: "DELETE",
      body: JSON.stringify({ confirmation }),
    }),
};

// Sessions API
export const sessionsApi = {
  list: (options?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());
    const queryString = params.toString();
    return apiRequest<{
      sessions: Array<{
        id: string;
        userId: string;
        userEmail?: string;
        userName?: string;
        clientId: string | null;
        deviceInfo: Record<string, unknown> | null;
        ipAddress: string | null;
        userAgent: string | null;
        mfaVerified: boolean;
        issuedAt: string;
        lastActivityAt: string;
        expiresAt: string;
        revoked: boolean;
      }>;
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/sessions${queryString ? `?${queryString}` : ""}`);
  },

  getMe: (options?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());
    const queryString = params.toString();
    return apiRequest<{
      sessions: Array<{
        id: string;
        userId: string;
        userEmail?: string;
        userName?: string;
        clientId: string | null;
        deviceInfo: Record<string, unknown> | null;
        ipAddress: string | null;
        userAgent: string | null;
        mfaVerified: boolean;
        issuedAt: string;
        lastActivityAt: string;
        expiresAt: string;
        revoked: boolean;
      }>;
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/sessions/me${queryString ? `?${queryString}` : ""}`);
  },

  getCurrent: () =>
    apiRequest<{
      user: { id: string; email: string; orgId: string };
      authenticated: boolean;
    }>("/sessions/current"),

  revoke: (sessionId: string) =>
    apiRequest<{ message: string }>(`/sessions/${sessionId}/revoke`, {
      method: "POST",
    }),

  logoutAll: () =>
    apiRequest<{ message: string; revokedCount: number }>(
      "/sessions/logout-all",
      {
        method: "POST",
      }
    ),
};

// OAuth API
export const oauthApi = {
  /** Get client info for authorization consent page */
  getAuthorizeInfo: (params: {
    client_id: string;
    redirect_uri: string;
    response_type: string;
    scope?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    nonce?: string;
  }) => {
    const searchParams = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );
    return apiRequest<{
      client_id: string;
      client_name: string;
      redirect_uri: string;
      scopes: string[];
      state: string;
      mfa_required: boolean;
    }>(`/oauth/authorize?${searchParams.toString()}`);
  },

  /** Verify MFA and authorize client - generates authorization code */
  verifyAndAuthorize: (body: {
    client_id: string;
    client_secret?: string;
    redirect_uri: string;
    scope?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    nonce?: string;
    otp_code?: string; // Required if MFA is enabled
  }) =>
    apiRequest<{ redirect_uri: string; success: boolean }>(
      "/oauth/verify-authorize",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),
};

// MFA API
export const mfaApi = {
  getStatus: () =>
    apiRequest<{
      enabled: boolean;
      methods: Array<{
        id: string;
        type: string;
        verified: boolean;
        createdAt: string;
      }>;
    }>("/mfa/status"),

  enroll: (type: string = "totp") =>
    apiRequest<{
      id: string;
      secret: string;
      totpUri: string;
      message: string;
    }>("/mfa/enroll", {
      method: "POST",
      body: JSON.stringify({ type }),
    }),

  verify: (code: string) =>
    apiRequest<{ message: string; enabled: boolean }>("/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  challenge: (userId: string, code: string) =>
    apiRequest<{
      message: string;
      user: {
        id: string;
        email: string;
        displayName: string;
        roles: string[];
      };
    }>("/mfa/challenge", {
      method: "POST",
      body: JSON.stringify({ userId, code }),
    }),

  disable: (code: string) =>
    apiRequest<{ message: string; enabled: boolean }>("/mfa/disable", {
      method: "DELETE",
      body: JSON.stringify({ code }),
    }),
};

// Export API
export const exportApi = {
  /**
   * Export users as CSV or JSON
   */
  users: async (
    format: "csv" | "json",
    filters?: Record<string, string | number | boolean>
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(`${API_URL}/export/users`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, filters }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Export failed");
    }

    // Return blob for download
    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    const filename =
      contentDisposition?.match(/filename="(.+)"/)?.[1] ||
      `users_export.${format}`;

    return { blob, filename };
  },

  /**
   * Export clients as CSV or JSON
   */
  clients: async (
    format: "csv" | "json"
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(`${API_URL}/export/clients`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Export failed");
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    const filename =
      contentDisposition?.match(/filename="(.+)"/)?.[1] ||
      `clients_export.${format}`;

    return { blob, filename };
  },
};

// Workflows API (Developer/Tenant Admin only)
import type {
  WorkflowListItem,
  Workflow,
  WorkflowGraph,
  ValidationResult,
  SimulationStep,
  TriggerTypeOption,
  ActionTypeOption,
  ConditionFieldOption,
  OperatorOption,
} from "./workflow.types";

export const workflowsApi = {
  list: (status?: "draft" | "published" | "disabled") => {
    const params = status ? `?status=${status}` : "";
    return apiRequest<{ workflows: WorkflowListItem[] }>(`/workflows${params}`);
  },

  get: (id: string) => apiRequest<{ workflow: Workflow }>(`/workflows/${id}`),

  create: (body: { name: string; description?: string }) =>
    apiRequest<{ workflow: Workflow }>("/workflows", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (
    id: string,
    body: { name?: string; description?: string; graph?: WorkflowGraph }
  ) =>
    apiRequest<{ workflow: Workflow }>(`/workflows/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    apiRequest<{ message: string }>(`/workflows/${id}`, { method: "DELETE" }),

  publish: (id: string) =>
    apiRequest<{ workflow: Workflow }>(`/workflows/${id}/publish`, {
      method: "POST",
    }),

  disable: (id: string) =>
    apiRequest<{ workflow: Workflow }>(`/workflows/${id}/disable`, {
      method: "POST",
    }),

  duplicate: (id: string) =>
    apiRequest<{ workflow: Workflow }>(`/workflows/${id}/duplicate`, {
      method: "POST",
    }),

  validate: (id: string) =>
    apiRequest<ValidationResult>(`/workflows/${id}/validate`, {
      method: "POST",
    }),

  preview: (id: string, mockData?: Record<string, unknown>) =>
    apiRequest<{
      steps: SimulationStep[];
      totalNodes: number;
      executedNodes: number;
    }>(`/workflows/${id}/preview`, {
      method: "POST",
      body: JSON.stringify({ mockData }),
    }),

  getTriggerTypes: () =>
    apiRequest<{ triggerTypes: TriggerTypeOption[] }>("/workflows/triggers"),

  getActionTypes: () =>
    apiRequest<{ actionTypes: ActionTypeOption[] }>("/workflows/actions"),

  getConditionFields: () =>
    apiRequest<{
      conditionFields: ConditionFieldOption[];
      operators: OperatorOption[];
    }>("/workflows/conditions"),

  execute: (id: string, context?: Record<string, unknown>) =>
    apiRequest<{
      success: boolean;
      workflowId: string;
      startedAt: string;
      completedAt: string;
      duration: number;
      steps: Array<{
        nodeId: string;
        nodeType: string;
        label: string;
        status: "pending" | "running" | "success" | "failed" | "skipped";
        duration?: number;
        output?: unknown;
        error?: string;
        path?: "true" | "false";
      }>;
    }>(`/workflows/${id}/execute`, {
      method: "POST",
      body: JSON.stringify({ context }),
    }),
};

// Billing API
export interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    plan: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  organization: {
    id: string;
    name: string;
    plan: string;
  };
  features: {
    maxUsers: number;
    maxClients: number;
    auditLogDays: number;
    mfaTypes: string[];
    ssoEnabled: boolean;
    customBranding: boolean;
  };
  usage: {
    users: { current: number; max: number };
    clients: { current: number; max: number };
  };
  hasPaymentMethod: boolean;
}

export const billingApi = {
  /** Get Stripe configuration (publishable key and prices) - no auth required */
  getConfig: () =>
    apiRequest<{
      publishableKey: string;
      prices: { starter: string; professional: string };
    }>("/billing/config"),

  /** Get current subscription status */
  getSubscription: () => apiRequest<SubscriptionData>("/billing/subscription"),

  /** Create Stripe Checkout session for plan upgrade */
  createCheckoutSession: (priceId: string) =>
    apiRequest<{ url: string }>("/billing/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({ priceId }),
    }),

  /** Create Stripe Customer Portal session */
  createPortalSession: () =>
    apiRequest<{ url: string }>("/billing/create-portal-session", {
      method: "POST",
    }),
};
