import type { Metadata } from "next";
import { CodeBlock, Callout } from "@/components/docs";

export const metadata: Metadata = {
  title: "SDK & Hooks | Signify iD Docs",
  description:
    "Learn how to use Signify iD React hooks and utilities for seamless authentication integration.",
};

export default function SdkPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">signifyid/client</h1>
        <p className="text-xl text-muted-foreground">
          Official React SDK for Signify iD - Digital Identity & Access
          Management. Authenticate users in your React or Next.js app with
          Signify iD in under 5 minutes.
        </p>
      </div>

      {/* What is Signify iD */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">What is Signify iD?</h2>
        <p className="text-muted-foreground">
          Signify iD is a modern Digital Identity & Access Management platform
          that provides:
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <strong>Single Sign-On (SSO)</strong> - One login for all your
            applications
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <strong>Session Management</strong> - Secure, token-based
            authentication
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <strong>User Management</strong> - Comprehensive user administration
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <strong>Multi-Factor Authentication</strong> - Enhanced security
            options
          </li>
        </ul>
        <p className="text-muted-foreground">
          This SDK enables seamless integration with Signify iD&apos;s
          redirect-based authentication flow.
        </p>
      </section>

      {/* Installation */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          code={`npm install signifyid/client`}
          language="bash"
          filename="npm"
        />
        <CodeBlock
          code={`yarn add signifyid/client`}
          language="bash"
          filename="yarn"
        />
        <CodeBlock
          code={`pnpm add signifyid/client`}
          language="bash"
          filename="pnpm"
        />
      </section>

      {/* Quick Start */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Quick Start (5 minutes)</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            1. Wrap your app with SignifyProvider
          </h3>
          <CodeBlock
            code={`// app/layout.tsx (Next.js App Router)
import { SignifyProvider } from "signifyid/client";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SignifyProvider
          config={{
            apiUrl: process.env.NEXT_PUBLIC_SIGNIFY_API_URL!,
            loginUrl: process.env.NEXT_PUBLIC_SIGNIFY_LOGIN_URL!,
          }}
        >
          {children}
        </SignifyProvider>
      </body>
    </html>
  );
}`}
            language="tsx"
            showLineNumbers
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            2. Protect routes that require authentication
          </h3>
          <CodeBlock
            code={`// app/dashboard/page.tsx
import { ProtectedRoute } from "signifyid/client";
import Dashboard from "./Dashboard";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}`}
            language="tsx"
            showLineNumbers
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            3. Use the auth hook in your components
          </h3>
          <CodeBlock
            code={`// components/Navbar.tsx
"use client";

import { useSignifyAuth } from "signifyid/client";

export function Navbar() {
  const { isAuthenticated, isLoading, user, login, logout } = useSignifyAuth();

  if (isLoading) {
    return <nav>Loading...</nav>;
  }

  return (
    <nav>
      {isAuthenticated ? (
        <>
          <span>Welcome, {user?.name}!</span>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={login}>Login with Signify iD</button>
      )}
    </nav>
  );
}`}
            language="tsx"
            showLineNumbers
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            4. Set up environment variables
          </h3>
          <CodeBlock
            code={`# .env.local
NEXT_PUBLIC_SIGNIFY_API_URL=https://api.signifyid.com
NEXT_PUBLIC_SIGNIFY_LOGIN_URL=https://signifyid.com/client/login`}
            language="bash"
            filename=".env.local"
          />
        </div>

        <Callout variant="tip" title="That's it! 🎉">
          <p>Your app now supports Signify iD authentication.</p>
        </Callout>
      </section>

      {/* API Reference */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">API Reference</h2>

        {/* SignifyProvider */}
        <div className="space-y-4">
          <h3 className="text-xl font-medium">SignifyProvider</h3>
          <p className="text-muted-foreground">
            The root provider that enables Signify iD authentication throughout
            your app.
          </p>
          <CodeBlock
            code={`<SignifyProvider
  config={{
    apiUrl: string;           // Required: Backend API URL
    loginUrl: string;         // Required: Signify iD login page URL
    cookieName?: string;      // Optional: Cookie name (default: "clientSession")
    cookieMaxAge?: number;    // Optional: Cookie max age in seconds (default: 86400)
    tokenParam?: string;      // Optional: URL token parameter (default: "token")
    debug?: boolean;          // Optional: Enable debug logging (default: false)
  }}
  onAuthStateChange?: (state) => void  // Optional: Callback on auth state changes
>
  {children}
</SignifyProvider>`}
            language="tsx"
          />

          <h4 className="text-base font-medium mt-4">Config Options</h4>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Option</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">Required</th>
                  <th className="text-left px-4 py-2 font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">apiUrl</td>
                  <td className="px-4 py-2 text-muted-foreground">string</td>
                  <td className="px-4 py-2 text-muted-foreground">Yes</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Backend API URL for session validation
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">loginUrl</td>
                  <td className="px-4 py-2 text-muted-foreground">string</td>
                  <td className="px-4 py-2 text-muted-foreground">Yes</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Signify iD login page URL
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">cookieName</td>
                  <td className="px-4 py-2 text-muted-foreground">string</td>
                  <td className="px-4 py-2 text-muted-foreground">No</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Cookie name (default: &quot;clientSession&quot;)
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">cookieMaxAge</td>
                  <td className="px-4 py-2 text-muted-foreground">number</td>
                  <td className="px-4 py-2 text-muted-foreground">No</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Cookie max age in seconds (default: 86400)
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">tokenParam</td>
                  <td className="px-4 py-2 text-muted-foreground">string</td>
                  <td className="px-4 py-2 text-muted-foreground">No</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    URL token parameter name (default: &quot;token&quot;)
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">debug</td>
                  <td className="px-4 py-2 text-muted-foreground">boolean</td>
                  <td className="px-4 py-2 text-muted-foreground">No</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Enable debug logging (default: false)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* useSignifyAuth */}
        <div className="space-y-4">
          <h3 className="text-xl font-medium">useSignifyAuth</h3>
          <p className="text-muted-foreground">
            Hook to access authentication state and methods.
          </p>
          <CodeBlock
            code={`const {
  isAuthenticated,   // boolean: Whether user is authenticated
  isLoading,         // boolean: Whether auth is being validated
  session,           // SignifySession | null: Full session data
  user,              // SignifyUser | null: User data (shortcut for session.user)
  login,             // () => void: Redirect to Signify iD login
  logout,            // () => Promise<void>: Log out and clear session
  validateSession,   // () => Promise<void>: Manually re-validate session
} = useSignifyAuth();`}
            language="tsx"
          />

          <h4 className="text-base font-medium mt-4">Return Values</h4>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Property</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">
                    isAuthenticated
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">boolean</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Whether user is authenticated
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">isLoading</td>
                  <td className="px-4 py-2 text-muted-foreground">boolean</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Whether auth is being validated
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">session</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    SignifySession | null
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Full session data
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">user</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    SignifyUser | null
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    User data (shortcut for session.user)
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">login</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    () =&gt; void
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Redirect to Signify iD login
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">logout</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    () =&gt; Promise&lt;void&gt;
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Log out and clear session
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">
                    validateSession
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    () =&gt; Promise&lt;void&gt;
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Manually re-validate session
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ProtectedRoute */}
        <div className="space-y-4">
          <h3 className="text-xl font-medium">ProtectedRoute</h3>
          <p className="text-muted-foreground">
            Component that protects children by requiring authentication.
          </p>
          <CodeBlock
            code={`<ProtectedRoute
  loadingComponent?: React.ReactNode   // Optional: Custom loading UI
  redirectUrl?: string                  // Optional: Custom redirect URL
  onRedirect?: () => void              // Optional: Callback before redirect
>
  {children}
</ProtectedRoute>`}
            language="tsx"
          />

          <h4 className="text-base font-medium mt-4">Props</h4>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Prop</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">
                    loadingComponent
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    React.ReactNode
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Custom loading UI to show during auth check
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">redirectUrl</td>
                  <td className="px-4 py-2 text-muted-foreground">string</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Custom URL to redirect unauthenticated users
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">onRedirect</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    () =&gt; void
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Callback before redirect happens
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* useSignifyConfig */}
        <div className="space-y-4">
          <h3 className="text-xl font-medium">useSignifyConfig</h3>
          <p className="text-muted-foreground">
            Hook to access the resolved configuration.
          </p>
          <CodeBlock
            code={`const config = useSignifyConfig();
// Returns: { apiUrl, loginUrl, cookieName, cookieMaxAge, tokenParam, debug }`}
            language="tsx"
          />
        </div>
      </section>

      {/* Authentication Flow */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Authentication Flow</h2>
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
      </section>

      {/* Next.js Examples */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Next.js Examples</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">App Router (Next.js 13+)</h3>
          <CodeBlock
            code={`// app/layout.tsx
import { SignifyProvider } from "signifyid/client";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SignifyProvider
          config={{
            apiUrl: process.env.NEXT_PUBLIC_SIGNIFY_API_URL!,
            loginUrl: process.env.NEXT_PUBLIC_SIGNIFY_LOGIN_URL!,
            debug: process.env.NODE_ENV === "development",
          }}
        >
          {children}
        </SignifyProvider>
      </body>
    </html>
  );
}`}
            language="tsx"
            showLineNumbers
          />

          <CodeBlock
            code={`// app/dashboard/layout.tsx
import { ProtectedRoute } from "signifyid/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute
      loadingComponent={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      }
    >
      {children}
    </ProtectedRoute>
  );
}`}
            language="tsx"
            showLineNumbers
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Pages Router</h3>
          <CodeBlock
            code={`// pages/_app.tsx
import type { AppProps } from "next/app";
import { SignifyProvider } from "signifyid/client";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SignifyProvider
      config={{
        apiUrl: process.env.NEXT_PUBLIC_SIGNIFY_API_URL!,
        loginUrl: process.env.NEXT_PUBLIC_SIGNIFY_LOGIN_URL!,
      }}
    >
      <Component {...pageProps} />
    </SignifyProvider>
  );
}`}
            language="tsx"
            showLineNumbers
          />

          <CodeBlock
            code={`// pages/dashboard.tsx
import { ProtectedRoute, useSignifyAuth } from "signifyid/client";

function DashboardContent() {
  const { user, logout } = useSignifyAuth();

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <p>Email: {user?.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}`}
            language="tsx"
            showLineNumbers
          />
        </div>
      </section>

      {/* TypeScript Support */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">TypeScript Support</h2>
        <p className="text-muted-foreground">
          This package is written in TypeScript and includes full type
          definitions.
        </p>
        <CodeBlock
          code={`import type {
  SignifyConfig,
  SignifySession,
  SignifyUser,
  SignifyAuthState,
  SignifyProviderProps,
  ProtectedRouteProps,
} from "signifyid/client";`}
          language="tsx"
        />

        <h3 className="text-lg font-medium mt-6">Custom User Type</h3>
        <p className="text-muted-foreground">
          If your Signify iD returns additional user properties:
        </p>
        <CodeBlock
          code={`interface MyUser extends SignifyUser {
  organizationId: string;
  role: "admin" | "user";
}

const { user } = useSignifyAuth();
const myUser = user as MyUser | null;`}
          language="tsx"
        />
      </section>

      {/* Advanced Usage */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Advanced Usage</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Listen to Auth State Changes</h3>
          <CodeBlock
            code={`<SignifyProvider
  config={config}
  onAuthStateChange={(state) => {
    if (state.isAuthenticated) {
      analytics.identify(state.user?.id);
    }
  }}
>
  {children}
</SignifyProvider>`}
            language="tsx"
            showLineNumbers
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Custom Redirect URL</h3>
          <CodeBlock
            code={`<ProtectedRoute redirectUrl="/custom-login">
  <Dashboard />
</ProtectedRoute>`}
            language="tsx"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Manual Session Validation</h3>
          <CodeBlock
            code={`const { validateSession } = useSignifyAuth();

// Re-validate session on demand
await validateSession();`}
            language="tsx"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Utility Functions</h3>
          <p className="text-muted-foreground">
            For advanced use cases, utility functions are also exported:
          </p>
          <CodeBlock
            code={`import {
  setCookie,
  getCookie,
  deleteCookie,
  getTokenFromUrl,
  cleanUrlParams,
  isBrowser,
} from "signifyid/client";`}
            language="tsx"
          />
        </div>
      </section>

      {/* Security Considerations */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Security Considerations</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
            <span>
              <strong>SSR Safe:</strong> All browser APIs are wrapped with{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                isBrowser()
              </code>{" "}
              checks
            </span>
          </li>
          <li className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
            <span>
              <strong>Credentials:</strong> Uses{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                credentials: &apos;include&apos;
              </code>{" "}
              for cross-domain cookie support
            </span>
          </li>
          <li className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
            <span>
              <strong>Token Cleanup:</strong> Automatically removes token from
              URL after extraction
            </span>
          </li>
          <li className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
            <span>
              <strong>Secure Cookies:</strong> Uses{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                SameSite=Lax
              </code>{" "}
              for CSRF protection
            </span>
          </li>
          <li className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
            <span>
              <strong>No Token Exposure:</strong> Tokens are stored in cookies,
              not in JavaScript state
            </span>
          </li>
        </ul>
      </section>

      {/* Troubleshooting */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Troubleshooting</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            &quot;useSignifyAuth must be used within a SignifyProvider&quot;
          </h3>
          <p className="text-muted-foreground">
            Make sure your component is a child of{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              &lt;SignifyProvider&gt;
            </code>
            :
          </p>
          <CodeBlock
            code={`// ❌ Wrong
<SignifyProvider>...</SignifyProvider>
<MyComponent /> // Outside provider!

// ✅ Correct
<SignifyProvider>
  <MyComponent /> // Inside provider
</SignifyProvider>`}
            language="tsx"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            Session not persisting after redirect
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>
              Ensure your{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                apiUrl
              </code>{" "}
              and{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                loginUrl
              </code>{" "}
              are correct
            </li>
            <li>Check if CORS is configured on your backend</li>
            <li>
              Verify cookies are being set (check browser DevTools → Application
              → Cookies)
            </li>
          </ol>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Infinite redirect loop</h3>
          <p className="text-muted-foreground">
            This usually happens when session validation always returns{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              valid: false
            </code>
            . Check:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Your backend is running and accessible</li>
            <li>
              The session validation endpoint is correct:{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                POST /api/client-auth/session/validate
              </code>
            </li>
            <li>Credentials are being sent with the request</li>
          </ol>
        </div>
      </section>

      {/* Contributing & License */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Contributing</h2>
        <p className="text-muted-foreground">
          Contributions are welcome! Please read our contributing guidelines
          before submitting PRs.
        </p>

        <h2 className="text-2xl font-semibold mt-8">License</h2>
        <p className="text-muted-foreground">
          MIT ©{" "}
          <a
            href="https://signifyid.com"
            className="text-primary hover:underline"
          >
            Signify iD
          </a>
        </p>
      </section>
    </div>
  );
}
