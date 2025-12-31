import type { Metadata } from "next";
import { CodeBlock, Callout } from "@/components/docs";
import {
  Shield,
  Key,
  Lock,
  Eye,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Security | Signify iD Docs",
  description:
    "Learn about Signify iD's security features including session management, token handling, MFA, and best practices.",
};

const securityFeatures = [
  {
    icon: Shield,
    title: "Zero Trust Architecture",
    description:
      "Every request is authenticated and authorized, regardless of origin.",
  },
  {
    icon: Key,
    title: "Secure Token Handling",
    description: "Tokens are encrypted at rest and in transit with AES-256.",
  },
  {
    icon: Lock,
    title: "Session Isolation",
    description: "Sessions are isolated per device with fingerprinting.",
  },
  {
    icon: Eye,
    title: "Audit Logging",
    description: "Complete audit trail of all security-relevant events.",
  },
];

export default function SecurityPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Security</h1>
        <p className="text-xl text-muted-foreground">
          Signify iD is built with security as a core principle. Learn about our
          security features and best practices for your integration.
        </p>
      </div>

      {/* Security Overview */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Security Overview</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {securityFeatures.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-4 p-4 rounded-xl border bg-card"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Session Security */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Session Security</h2>
        <p className="text-muted-foreground leading-relaxed">
          Sessions are the foundation of authenticated access. Signify iD
          implements multiple layers of protection:
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <h3 className="font-medium">Device Fingerprinting</h3>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              Each session is bound to a device fingerprint. Attempts to use a
              session from a different device are blocked.
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <h3 className="font-medium">IP Tracking</h3>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              Session IP addresses are monitored. Unusual location changes
              trigger security alerts.
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <h3 className="font-medium">Automatic Expiry</h3>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              Sessions expire after configurable idle and absolute timeouts.
              Default: 30 min idle, 24 hours absolute.
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <h3 className="font-medium">Remote Revocation</h3>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              Administrators can revoke any session instantly from the
              dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Token Handling */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Token Handling</h2>
        <p className="text-muted-foreground leading-relaxed">
          Proper token handling is crucial for security. Follow these
          guidelines:
        </p>

        <Callout variant="danger" title="Never expose secrets">
          <p>
            Client Secrets and access tokens should never appear in client-side
            code, browser network requests, or logs.
          </p>
        </Callout>

        <h3 className="text-lg font-medium mt-6">
          Access Token Best Practices
        </h3>
        <CodeBlock
          code={`// ✅ DO: Store access tokens in memory only
let accessToken: string | null = null;

// ✅ DO: Use short-lived tokens
const TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

// ✅ DO: Refresh before expiry
const refreshBeforeExpiry = async () => {
  const expiresIn = getTokenExpiry(accessToken);
  if (expiresIn < 60) { // Less than 1 minute
    accessToken = await refreshToken();
  }
};

// ❌ DON'T: Store in localStorage
localStorage.setItem('accessToken', token); // UNSAFE!

// ❌ DON'T: Include in URLs
\`/api/data?token=\${accessToken}\` // UNSAFE!`}
          language="typescript"
          showLineNumbers
        />

        <h3 className="text-lg font-medium mt-6">
          Refresh Token Best Practices
        </h3>
        <CodeBlock
          code={`// ✅ DO: Store in HTTP-only cookies
res.cookie('refresh_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// ✅ DO: Rotate on use
const newTokens = await exchangeRefreshToken(oldRefreshToken);
// Old refresh token is now invalid

// ❌ DON'T: Store in JavaScript-accessible storage
sessionStorage.setItem('refreshToken', token); // UNSAFE!`}
          language="typescript"
          showLineNumbers
        />
      </section>

      {/* MFA */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Multi-Factor Authentication</h2>
        <p className="text-muted-foreground leading-relaxed">
          Signify iD supports TOTP-based multi-factor authentication using
          authenticator apps like Google Authenticator, Authy, or 1Password.
        </p>

        <div className="rounded-xl border bg-muted/30 p-6">
          <h3 className="font-medium mb-4">MFA Flow</h3>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </span>
              <span className="text-muted-foreground">
                User enables MFA in their security settings
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                2
              </span>
              <span className="text-muted-foreground">
                Signify iD generates a secret and displays QR code
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                3
              </span>
              <span className="text-muted-foreground">
                User scans QR code with authenticator app
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                4
              </span>
              <span className="text-muted-foreground">
                User enters 6-digit code to verify setup
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                5
              </span>
              <span className="text-muted-foreground">
                Future logins require code after password
              </span>
            </li>
          </ol>
        </div>

        <Callout variant="tip" title="Encourage MFA adoption">
          <p>
            Consider requiring MFA for users with elevated permissions or access
            to sensitive data.
          </p>
        </Callout>
      </section>

      {/* Best Practices */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Integration Security Checklist
        </h2>
        <p className="text-muted-foreground">
          Use this checklist to ensure your integration is secure:
        </p>

        <div className="space-y-2">
          {[
            "Client Secret is stored in environment variables, not code",
            "HTTPS is used for all API communication",
            "OAuth state parameter is validated on callback",
            "Access tokens are stored in memory, not localStorage",
            "Refresh tokens are stored in HTTP-only cookies",
            "Token refresh happens before expiry",
            "Session timeouts are configured appropriately",
            "MFA is available or required for sensitive operations",
            "Audit logs are monitored for suspicious activity",
            "CORS is configured to allow only trusted origins",
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-2">
              <div className="h-5 w-5 rounded border flex items-center justify-center">
                <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Reporting */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Security Reporting</h2>
        <Callout variant="warning" title="Found a vulnerability?">
          <p>
            If you discover a security vulnerability in Signify iD, please
            report it responsibly to{" "}
            <code className="px-1 py-0.5 rounded bg-muted text-xs">
              security@signifyid.com
            </code>
            . We appreciate your help in keeping our platform secure.
          </p>
        </Callout>
      </section>
    </div>
  );
}
