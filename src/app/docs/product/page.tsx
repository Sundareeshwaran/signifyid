import type { Metadata } from "next";
import { Callout } from "@/components/docs";
import { Shield, Users, Key, Activity, Lock, Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Product & Services | Signify iD Docs",
  description:
    "Learn about Signify iD's Digital Identity and Access Management platform, features, and capabilities.",
};

const features = [
  {
    icon: Users,
    title: "Multi-Tenant Architecture",
    description:
      "Support multiple organizations with isolated data, custom branding, and independent user management. Each tenant operates in a secure, segregated environment.",
  },
  {
    icon: Key,
    title: "OAuth2/OIDC Authentication",
    description:
      "Industry-standard authentication protocols with support for authorization code flow, refresh tokens, and secure session management.",
  },
  {
    icon: Shield,
    title: "Role-Based Access Control",
    description:
      "Granular permission system with customizable roles. Define exactly what each user can access with resource:action permission pairs.",
  },
  {
    icon: Activity,
    title: "Session Management",
    description:
      "Real-time session tracking with device fingerprinting, location detection, and the ability to revoke sessions remotely.",
  },
  {
    icon: Lock,
    title: "Multi-Factor Authentication",
    description:
      "Strengthen security with TOTP-based MFA. Users can enable authenticator apps for an additional layer of protection.",
  },
  {
    icon: Settings,
    title: "Audit & Compliance",
    description:
      "Complete audit trail of all authentication events, permission changes, and administrative actions for compliance requirements.",
  },
];

export default function ProductPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Product & Services
        </h1>
        <p className="text-xl text-muted-foreground">
          Signify iD is a comprehensive Digital Identity and Access Management
          (DIAM) platform built for modern enterprise applications.
        </p>
      </div>

      {/* Overview */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">DIAM Overview</h2>
        <p className="text-muted-foreground leading-relaxed">
          Digital Identity and Access Management (DIAM) encompasses the
          policies, processes, and technologies used to manage digital
          identities and control access to resources. Signify iD provides a
          complete solution for implementing DIAM in your applications.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Unlike traditional IAM solutions that focus solely on internal
          employee access, Signify iD is designed for both B2B and B2C
          scenarios, enabling you to manage customer identities, partner access,
          and internal users from a single platform.
        </p>
      </section>

      {/* Key Features */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Key Features</h2>
        <div className="grid gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-4 p-5 rounded-xl border bg-card"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Client Authentication System */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Client Authentication System</h2>
        <p className="text-muted-foreground leading-relaxed">
          The Client Authentication System allows third-party applications to
          authenticate users securely. Each client application receives a unique
          Client ID and Client Secret pair for OAuth2 flows.
        </p>
        <div className="rounded-xl border bg-muted/30 p-6 space-y-4">
          <h3 className="font-medium text-lg">How it works:</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Register your application to receive credentials</li>
            <li>User initiates login from your application</li>
            <li>User is redirected to Signify iD for authentication</li>
            <li>Upon success, user is redirected back with an auth code</li>
            <li>Exchange the code for access and refresh tokens</li>
            <li>Use tokens to access protected resources</li>
          </ol>
        </div>
        <Callout variant="info" title="Learn more">
          <p>
            See the Client Authentication section for detailed implementation
            guides and code examples.
          </p>
        </Callout>
      </section>

      {/* RBAC */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Role-Based Access Control</h2>
        <p className="text-muted-foreground leading-relaxed">
          Signify iD uses a permission-based RBAC model where roles are
          collections of permissions. Permissions follow the format{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
            resource:action
          </code>
          , providing fine-grained control over what users can do.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 space-y-2">
            <h3 className="font-medium">System Roles</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • <strong>Super Admin</strong> - Full system access (*)
              </li>
              <li>
                • <strong>Tenant Admin</strong> - Organization management
              </li>
              <li>
                • <strong>Developer</strong> - API and client access
              </li>
              <li>
                • <strong>User</strong> - Basic authenticated access
              </li>
            </ul>
          </div>
          <div className="rounded-xl border p-4 space-y-2">
            <h3 className="font-medium">Permission Examples</h3>
            <ul className="text-sm text-muted-foreground space-y-1 font-mono">
              <li>• users:read</li>
              <li>• users:create</li>
              <li>• clients:manage</li>
              <li>• sessions:revoke</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Sessions */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Session Management</h2>
        <p className="text-muted-foreground leading-relaxed">
          Every authenticated user has an active session. Sessions include:
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Device information (browser, OS, device type)
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            IP address and approximate location
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Last activity timestamp
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Current status (active, expired, revoked)
          </li>
        </ul>
        <Callout variant="tip" title="Security feature">
          <p>
            Administrators can view all active sessions for their organization
            and revoke any suspicious sessions instantly.
          </p>
        </Callout>
      </section>
    </div>
  );
}
