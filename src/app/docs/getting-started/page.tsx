import type { Metadata } from "next";
import { CodeBlock, Callout } from "@/components/docs";

export const metadata: Metadata = {
  title: "Getting Started | Signify iD Docs",
  description:
    "Learn how to set up and integrate Signify iD into your application with our step-by-step guide.",
};

export default function GettingStartedPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Getting Started</h1>
        <p className="text-xl text-muted-foreground">
          Get Signify iD integrated into your React or Next.js application in
          under 5 minutes.
        </p>
      </div>

      {/* Prerequisites */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Prerequisites</h2>
        <p className="text-muted-foreground">
          Before you begin, make sure you have:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>Node.js 18.x or higher</li>
          <li>A Signify iD account (sign up at the dashboard)</li>
          <li>Your organization&apos;s API URL and Login URL</li>
        </ul>
      </section>

      {/* Installation */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <p className="text-muted-foreground">
          Install the Signify iD client SDK using your preferred package
          manager:
        </p>
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

      {/* Environment Variables */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Environment Variables</h2>
        <p className="text-muted-foreground">
          Configure your environment with the following variables:
        </p>
        <CodeBlock
          code={`# .env.local
NEXT_PUBLIC_SIGNIFY_API_URL=https://api.signifyid.com
NEXT_PUBLIC_SIGNIFY_LOGIN_URL=https://signifyid.com/client/login`}
          language="bash"
          filename=".env.local"
        />
        <Callout variant="warning" title="Keep URLs correct">
          <p>
            Make sure your API URL and Login URL are correct for your
            environment. Use different values for development and production.
          </p>
        </Callout>
      </section>

      {/* Wrap with Provider */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Step 1: Wrap Your App with SignifyProvider
        </h2>
        <p className="text-muted-foreground">
          Wrap your application with the SignifyProvider to enable
          authentication:
        </p>
        <CodeBlock
          code={`// app/layout.tsx (Next.js App Router)
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
          }}
        >
          {children}
        </SignifyProvider>
      </body>
    </html>
  );
}`}
          language="tsx"
          filename="app/layout.tsx"
          showLineNumbers
        />
      </section>

      {/* Protect Routes */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Step 2: Protect Routes That Require Authentication
        </h2>
        <p className="text-muted-foreground">
          Use the ProtectedRoute component to secure pages:
        </p>
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
          filename="app/dashboard/page.tsx"
          showLineNumbers
        />
      </section>

      {/* Use Auth Hook */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Step 3: Use the Auth Hook in Your Components
        </h2>
        <p className="text-muted-foreground">
          Access authentication state and methods with the useSignifyAuth hook:
        </p>
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
          filename="components/Navbar.tsx"
          showLineNumbers
        />
      </section>

      {/* That's it */}
      <section className="space-y-4">
        <Callout variant="tip" title="That's it! 🎉">
          <p>
            Your app now supports Signify iD authentication. Users will be
            redirected to Signify iD for login, and the SDK handles token
            extraction and session validation automatically.
          </p>
        </Callout>
      </section>

      {/* Next Steps */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Next Steps</h2>
        <p className="text-muted-foreground">
          You&apos;re all set! Here&apos;s what to explore next:
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="font-medium text-foreground">→</span>
            Learn about the complete SDK API Reference
          </li>
          <li className="flex items-center gap-2">
            <span className="font-medium text-foreground">→</span>
            Explore advanced usage patterns and configuration options
          </li>
          <li className="flex items-center gap-2">
            <span className="font-medium text-foreground">→</span>
            Set up role-based access control in your app
          </li>
        </ul>
        <Callout variant="tip" title="Need help?">
          <p>
            Check out our FAQ section for common issues, or reach out to our
            support team if you need assistance.
          </p>
        </Callout>
      </section>
    </div>
  );
}
