import type { Metadata } from "next";
import { CodeBlock, Callout } from "@/components/docs";

export const metadata: Metadata = {
  title: "Client Authentication | Signify iD Docs",
  description:
    "Learn how to implement client authentication with Signify iD redirect-based flows, including login, session management, and logout.",
};

export default function ClientAuthPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Client Authentication
        </h1>
        <p className="text-xl text-muted-foreground">
          Implement secure authentication for your application using Signify
          iD&apos;s redirect-based authentication system.
        </p>
      </div>

      {/* Authentication Flow */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Authentication Flow</h2>
        <p className="text-muted-foreground leading-relaxed">
          Signify iD uses a redirect-based authentication flow. Here&apos;s how
          it works:
        </p>

        <CodeBlock
          code={`┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Your App     │    │   Signify iD    │    │  Signify API    │
│                 │    │   Login Page    │    │                 │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         │ 1. User visits       │                      │
         │    protected route   │                      │
         │                      │                      │
         │ 2. Redirect ───────► │                      │
         │    ?redirect=...     │                      │
         │                      │                      │
         │                      │ 3. User logs in      │
         │                      │                      │
         │ 4. Redirect back ◄── │                      │
         │    ?token=...        │                      │
         │                      │                      │
         │ 5. SDK extracts token, stores in cookie     │
         │                      │                      │
         │ 6. Validate session ─────────────────────► │
         │                      │                      │
         │ 7. Session data ◄─────────────────────────  │
         │                      │                      │
         │ 8. User authenticated│                      │
         │    ✓                 │                      │`}
          language="text"
          filename="Authentication Flow"
        />

        <div className="rounded-xl border bg-muted/30 p-6">
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </span>
              <div>
                <p className="font-medium">User Visits Protected Route</p>
                <p className="text-sm text-muted-foreground">
                  User attempts to access a page wrapped with ProtectedRoute
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </span>
              <div>
                <p className="font-medium">Redirect to Signify iD</p>
                <p className="text-sm text-muted-foreground">
                  User is redirected to Signify iD login page with a redirect
                  URL
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                3
              </span>
              <div>
                <p className="font-medium">User Authenticates</p>
                <p className="text-sm text-muted-foreground">
                  User enters credentials and completes MFA if required
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                4
              </span>
              <div>
                <p className="font-medium">Redirect Back with Token</p>
                <p className="text-sm text-muted-foreground">
                  User is redirected back to your app with a token in the URL
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                5
              </span>
              <div>
                <p className="font-medium">SDK Processes Token</p>
                <p className="text-sm text-muted-foreground">
                  The SDK automatically extracts the token, stores it in a
                  cookie, and cleans the URL
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                6
              </span>
              <div>
                <p className="font-medium">Session Validation</p>
                <p className="text-sm text-muted-foreground">
                  The SDK validates the session with the Signify API and
                  retrieves user data
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Using the SDK */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Using the SDK</h2>
        <p className="text-muted-foreground leading-relaxed">
          The Signify iD SDK handles the entire authentication flow for you.
          Here&apos;s how to implement it:
        </p>

        <h3 className="text-lg font-medium mt-6">1. Configure the Provider</h3>
        <CodeBlock
          code={`import { SignifyProvider } from "signifyid/client";

<SignifyProvider
  config={{
    apiUrl: process.env.NEXT_PUBLIC_SIGNIFY_API_URL!,
    loginUrl: process.env.NEXT_PUBLIC_SIGNIFY_LOGIN_URL!,
    cookieName: "clientSession",     // Optional
    cookieMaxAge: 86400,             // Optional: 24 hours
    tokenParam: "token",             // Optional
    debug: false,                    // Optional
  }}
  onAuthStateChange={(state) => {
    // Optional: Listen to auth state changes
    console.log("Auth state changed:", state);
  }}
>
  {children}
</SignifyProvider>`}
          language="tsx"
          showLineNumbers
        />

        <h3 className="text-lg font-medium mt-6">2. Trigger Login</h3>
        <CodeBlock
          code={`import { useSignifyAuth } from "signifyid/client";

function LoginButton() {
  const { login, isLoading } = useSignifyAuth();

  return (
    <button onClick={login} disabled={isLoading}>
      {isLoading ? "Redirecting..." : "Sign in with Signify iD"}
    </button>
  );
}`}
          language="tsx"
          showLineNumbers
        />

        <h3 className="text-lg font-medium mt-6">3. Access User Data</h3>
        <CodeBlock
          code={`import { useSignifyAuth } from "signifyid/client";

function UserProfile() {
  const { isAuthenticated, user, session } = useSignifyAuth();

  if (!isAuthenticated) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <p>Email: {user?.email}</p>
      <p>Session expires: {new Date(session?.expiresAt).toLocaleString()}</p>
    </div>
  );
}`}
          language="tsx"
          showLineNumbers
        />
      </section>

      {/* Session Management */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Session Management</h2>
        <p className="text-muted-foreground leading-relaxed">
          The SDK manages sessions automatically using secure cookies.
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <h3 className="font-medium mb-2">Cookie Storage</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Tokens are stored in HTTP-only cookies</li>
              <li>
                • Default cookie name:{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  clientSession
                </code>
              </li>
              <li>
                • Uses{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  SameSite=Lax
                </code>{" "}
                for CSRF protection
              </li>
            </ul>
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="font-medium mb-2">Automatic Validation</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Session is validated on page load</li>
              <li>• Invalid sessions trigger automatic logout</li>
              <li>
                • Manual re-validation available via{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  validateSession()
                </code>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="font-medium mb-2">Token Handling</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Tokens are extracted from URL automatically</li>
              <li>• URL is cleaned after token extraction</li>
              <li>• Tokens are never exposed in JavaScript state</li>
            </ul>
          </div>
        </div>

        <h3 className="text-lg font-medium mt-6">Manual Session Validation</h3>
        <CodeBlock
          code={`const { validateSession } = useSignifyAuth();

// Re-validate session on demand
const handleRefresh = async () => {
  await validateSession();
  console.log("Session re-validated");
};`}
          language="tsx"
        />
      </section>

      {/* Protected Routes */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Protected Routes</h2>
        <p className="text-muted-foreground">
          Use the ProtectedRoute component to secure pages:
        </p>
        <CodeBlock
          code={`import { ProtectedRoute } from "signifyid/client";

// Basic usage
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// With custom loading component
<ProtectedRoute
  loadingComponent={
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  }
>
  <Dashboard />
</ProtectedRoute>

// With custom redirect URL
<ProtectedRoute redirectUrl="/custom-login">
  <Dashboard />
</ProtectedRoute>

// With redirect callback
<ProtectedRoute
  onRedirect={() => {
    analytics.track("Unauthenticated access attempt");
  }}
>
  <Dashboard />
</ProtectedRoute>`}
          language="tsx"
          showLineNumbers
        />
      </section>

      {/* Logout */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Logging Out</h2>
        <p className="text-muted-foreground">
          Use the logout function to sign out users:
        </p>
        <CodeBlock
          code={`import { useSignifyAuth } from "signifyid/client";

function LogoutButton() {
  const { logout, isLoading } = useSignifyAuth();

  const handleLogout = async () => {
    await logout();
    // User is now logged out
    // Session cookie is cleared
  };

  return (
    <button onClick={handleLogout} disabled={isLoading}>
      {isLoading ? "Signing out..." : "Sign Out"}
    </button>
  );
}`}
          language="tsx"
          showLineNumbers
        />
        <Callout variant="info" title="Logout Behavior">
          <p>
            The logout function clears the session cookie and calls the API to
            invalidate the session server-side. The user will need to
            re-authenticate on their next visit.
          </p>
        </Callout>
      </section>

      {/* Security */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Security Considerations</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 space-y-2">
            <h4 className="font-medium text-foreground">SSR Safe</h4>
            <p className="text-sm text-muted-foreground">
              All browser APIs are wrapped with{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                isBrowser()
              </code>{" "}
              checks for server-side rendering compatibility.
            </p>
          </div>
          <div className="rounded-xl border p-4 space-y-2">
            <h4 className="font-medium text-foreground">CORS Support</h4>
            <p className="text-sm text-muted-foreground">
              Uses{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                credentials: &apos;include&apos;
              </code>{" "}
              for cross-domain cookie support with CORS.
            </p>
          </div>
          <div className="rounded-xl border p-4 space-y-2">
            <h4 className="font-medium text-foreground">Token Security</h4>
            <p className="text-sm text-muted-foreground">
              Tokens are automatically removed from URLs after extraction to
              prevent exposure in browser history.
            </p>
          </div>
          <div className="rounded-xl border p-4 space-y-2">
            <h4 className="font-medium text-foreground">CSRF Protection</h4>
            <p className="text-sm text-muted-foreground">
              Uses{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                SameSite=Lax
              </code>{" "}
              cookies for built-in CSRF protection.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
