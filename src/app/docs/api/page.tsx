import type { Metadata } from "next";
import { ApiEndpoint, Callout } from "@/components/docs";

export const metadata: Metadata = {
  title: "API Reference | Signify iD Docs",
  description:
    "Complete REST API documentation for Signify iD with endpoints, request examples, and response formats.",
};

export default function ApiPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">API Reference</h1>
        <p className="text-xl text-muted-foreground">
          Complete REST API documentation for integrating with Signify iD.
        </p>
      </div>

      {/* Base URL */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Base URL</h2>
        <div className="rounded-xl border bg-muted/30 p-4 font-mono text-sm">
          https://api.signifyid.com/v1
        </div>
        <Callout variant="info" title="Authentication">
          <p>
            All API requests require a Bearer token in the Authorization header.
            Obtain tokens via the OAuth2 flow described in Client
            Authentication.
          </p>
        </Callout>
      </section>

      {/* Authentication Endpoints */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Authentication</h2>

        <ApiEndpoint
          method="POST"
          path="/api/client-auth/login"
          title="Initiate Client Login"
          description="Initiates the OAuth2 authorization flow for a client application."
          parameters={[
            {
              name: "client_id",
              type: "string",
              required: true,
              description: "Your application's Client ID",
            },
            {
              name: "redirect_uri",
              type: "string",
              required: true,
              description: "URL to redirect after authentication",
            },
            {
              name: "scope",
              type: "string",
              required: false,
              description: "Space-separated list of scopes",
            },
          ]}
          requestBody={`{
  "client_id": "cli_abc123xyz789",
  "redirect_uri": "https://yourapp.com/callback",
  "scope": "openid profile email"
}`}
          responseBody={`{
  "authorization_url": "https://signifyid.com/authorize?...",
  "state": "random_state_string"
}`}
        />

        <ApiEndpoint
          method="POST"
          path="/api/client-auth/token"
          title="Exchange Code for Tokens"
          description="Exchanges an authorization code for access and refresh tokens."
          headers={[
            {
              name: "Content-Type",
              value: "application/json",
              description: "Required for JSON body",
            },
          ]}
          requestBody={`{
  "grant_type": "authorization_code",
  "client_id": "cli_abc123xyz789",
  "client_secret": "sec_••••••••••••",
  "code": "auth_code_from_callback",
  "redirect_uri": "https://yourapp.com/callback"
}`}
          responseBody={`{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "ref_xyz789abc123...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email"
}`}
        />

        <ApiEndpoint
          method="POST"
          path="/api/client-auth/refresh"
          title="Refresh Access Token"
          description="Uses a refresh token to obtain a new access token."
          requestBody={`{
  "grant_type": "refresh_token",
  "client_id": "cli_abc123xyz789",
  "client_secret": "sec_••••••••••••",
  "refresh_token": "ref_xyz789abc123..."
}`}
          responseBody={`{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}`}
        />

        <ApiEndpoint
          method="POST"
          path="/api/client-auth/logout"
          title="Revoke Session"
          description="Revokes the current session and invalidates tokens."
          headers={[
            {
              name: "Authorization",
              value: "Bearer <access_token>",
              description: "Current access token",
            },
          ]}
          responseBody={`{
  "success": true,
  "message": "Session revoked successfully"
}`}
        />
      </section>

      {/* Session Endpoints */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Sessions</h2>

        <ApiEndpoint
          method="GET"
          path="/api/sessions/me"
          title="Get Current Session"
          description="Returns information about the current authenticated session."
          headers={[
            {
              name: "Authorization",
              value: "Bearer <access_token>",
              description: "Current access token",
            },
          ]}
          responseBody={`{
  "session_id": "sess_abc123",
  "user": {
    "id": "usr_xyz789",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "device": {
    "browser": "Chrome",
    "os": "Windows 10",
    "ip": "192.168.1.1"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "expires_at": "2024-01-16T10:30:00Z"
}`}
        />

        <ApiEndpoint
          method="GET"
          path="/api/sessions"
          title="List All Sessions"
          description="Returns all active sessions for the current user."
          headers={[
            {
              name: "Authorization",
              value: "Bearer <access_token>",
              description: "Current access token",
            },
          ]}
          responseBody={`{
  "sessions": [
    {
      "id": "sess_abc123",
      "device": "Chrome on Windows",
      "ip": "192.168.1.1",
      "last_active": "2024-01-15T10:30:00Z",
      "is_current": true
    },
    {
      "id": "sess_def456",
      "device": "Safari on iPhone",
      "ip": "192.168.1.2",
      "last_active": "2024-01-14T08:15:00Z",
      "is_current": false
    }
  ]
}`}
        />

        <ApiEndpoint
          method="DELETE"
          path="/api/sessions/{session_id}"
          title="Revoke Session"
          description="Revokes a specific session by ID."
          parameters={[
            {
              name: "session_id",
              type: "string",
              required: true,
              description: "The session ID to revoke",
            },
          ]}
          responseBody={`{
  "success": true,
  "message": "Session revoked"
}`}
        />
      </section>

      {/* User Endpoints */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Users</h2>

        <ApiEndpoint
          method="GET"
          path="/api/users/me"
          title="Get Current User"
          description="Returns the authenticated user's profile information."
          headers={[
            {
              name: "Authorization",
              value: "Bearer <access_token>",
              description: "Current access token",
            },
          ]}
          responseBody={`{
  "id": "usr_xyz789",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar_url": null,
  "role": "user",
  "permissions": ["profile:read", "sessions:read"],
  "mfa_enabled": true,
  "created_at": "2024-01-01T00:00:00Z"
}`}
        />
      </section>

      {/* Error Handling */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Error Handling</h2>
        <p className="text-muted-foreground">
          All API errors follow a consistent format:
        </p>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b bg-muted/50 px-4 py-2">
            <span className="text-xs font-mono text-muted-foreground uppercase">
              Error Response
            </span>
          </div>
          <pre className="p-4 text-sm font-mono overflow-x-auto">
            {`{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "The access token is expired or invalid",
    "status": 401
  }
}`}
          </pre>
        </div>

        <h3 className="text-lg font-medium mt-6">Common Error Codes</h3>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Code</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2 font-mono text-xs">INVALID_TOKEN</td>
                <td className="px-4 py-2">401</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Token is invalid or expired
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2 font-mono text-xs">FORBIDDEN</td>
                <td className="px-4 py-2">403</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Insufficient permissions
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2 font-mono text-xs">NOT_FOUND</td>
                <td className="px-4 py-2">404</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Resource not found
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2 font-mono text-xs">RATE_LIMITED</td>
                <td className="px-4 py-2">429</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Too many requests
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2 font-mono text-xs">SERVER_ERROR</td>
                <td className="px-4 py-2">500</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Internal server error
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
