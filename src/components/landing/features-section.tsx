"use client";

import {
  Shield,
  Lock,
  Users,
  BarChart3,
  Key,
  Fingerprint,
  Globe,
  Zap,
} from "lucide-react";
import { useStaggeredReveal, useScrollReveal } from "@/hooks/use-gsap";

const features = [
  {
    icon: Shield,
    title: "SSO & MFA",
    description:
      "OAuth2 and OpenID Connect based single sign-on with multi-factor authentication using TOTP and WebAuthn.",
    size: "large",
  },
  {
    icon: Lock,
    title: "Client Authentication",
    description:
      "Secure client credentials management with automatic rotation and granular scope control.",
    size: "small",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description:
      "Fine-grained RBAC with customizable roles, permissions, and real-time policy enforcement.",
    size: "small",
  },
  {
    icon: BarChart3,
    title: "Security Analytics",
    description:
      "Comprehensive audit logs, session monitoring, and security insights at your fingertips.",
    size: "large",
  },
  {
    icon: Key,
    title: "API Keys Management",
    description:
      "Generate, rotate, and manage API keys with fine-grained permissions and expiration policies.",
    size: "small",
  },
  {
    icon: Fingerprint,
    title: "Biometric Auth",
    description:
      "Support for WebAuthn passkeys, fingerprint, and face recognition for passwordless login.",
    size: "small",
  },
  {
    icon: Globe,
    title: "Multi-Tenant",
    description:
      "Complete tenant isolation with customizable branding and policies per organization.",
    size: "small",
  },
  {
    icon: Zap,
    title: "Real-Time Sync",
    description:
      "Instant permission updates across all services with event-driven architecture.",
    size: "small",
  },
];

export function FeaturesSection() {
  const titleRef = useScrollReveal<HTMLDivElement>({ y: 30 });
  const ref = useStaggeredReveal<HTMLDivElement>("[data-feature-card]", {
    y: 40,
    stagger: 0.08,
  });

  return (
    <section className="py-24 md:py-32 lg:py-40">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div ref={titleRef} className="text-center mb-16 lg:mb-20">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Features
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 tracking-tight">
            Everything you need for{" "}
            <span className="text-shimmer">secure identity</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for security teams, loved by developers. Enterprise-grade
            identity management made simple.
          </p>
        </div>

        {/* Bento Grid */}
        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 max-w-7xl mx-auto"
        >
          {features.map((feature, index) => (
            <div
              key={feature.title}
              data-feature-card
              className={`group relative p-6 lg:p-8 rounded-3xl border bg-card card-premium ${
                feature.size === "large" ? "md:col-span-2" : ""
              } ${index === 0 || index === 3 ? "lg:row-span-1" : ""}`}
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Icon */}
              <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>

              {/* Content */}
              <div className="relative">
                <h3 className="font-semibold text-xl mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Decorative corner accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
