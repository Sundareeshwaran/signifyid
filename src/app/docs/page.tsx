"use client";

import Link from "next/link";
import {
  ArrowRight,
  Book,
  Code2,
  KeyRound,
  Package,
  Rocket,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHeroAnimation, useStaggeredReveal } from "@/hooks/use-gsap";

const quickLinks = [
  {
    title: "Getting Started",
    description: "Set up Signify iD in your application in minutes",
    href: "/docs/getting-started",
    icon: Rocket,
  },
  {
    title: "Client Authentication",
    description: "Implement secure client login with OAuth2 flows",
    href: "/docs/client-auth",
    icon: KeyRound,
  },
  {
    title: "API Reference",
    description: "Complete REST API documentation with examples",
    href: "/docs/api",
    icon: Code2,
  },
  {
    title: "SDK & Hooks",
    description: "React hooks and utilities for seamless integration",
    href: "/docs/sdk",
    icon: Package,
  },
];

const features = [
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 Type II compliant with zero-trust architecture",
  },
  {
    icon: Zap,
    title: "Fast Integration",
    description: "Get started in under 10 minutes with our SDK",
  },
  {
    icon: Book,
    title: "Comprehensive Docs",
    description: "Detailed guides, examples, and API references",
  },
];

export default function DocsHomePage() {
  const heroRef = useHeroAnimation<HTMLDivElement>();
  const cardsRef = useStaggeredReveal<HTMLDivElement>("[data-card]", {
    y: 30,
    stagger: 0.1,
  });

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div ref={heroRef} className="space-y-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
          <Book className="h-4 w-4" />
          Documentation
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Build secure identity{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-chart-2">
            faster
          </span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Signify iD is a multi-tenant identity platform with OAuth2/OIDC,
          role-based access control, and enterprise-grade security. Learn how to
          integrate it into your applications.
        </p>

        <div className="flex items-center gap-4 pt-2">
          <Link href="/docs/getting-started">
            <Button size="lg" className="gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/docs/api">
            <Button size="lg" variant="outline">
              API Reference
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div ref={cardsRef} className="grid md:grid-cols-2 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            data-card
            className="group flex items-start gap-4 p-5 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <link.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {link.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {link.description}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto mt-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>

      {/* Features Strip */}
      <div className="grid md:grid-cols-3 gap-6 py-8 border-y">
        {features.map((feature) => (
          <div key={feature.title} className="flex items-start gap-3">
            <feature.icon className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-sm">{feature.title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* What is Signify iD */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">What is Signify iD?</h2>
        <p className="text-muted-foreground leading-relaxed">
          Signify iD is a Digital Identity and Access Management (DIAM) platform
          designed for modern applications. It provides a complete solution for
          authentication, authorization, and user management across multi-tenant
          environments.
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            OAuth2/OIDC compliant single sign-on
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Granular role-based access control (RBAC)
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Multi-factor authentication (MFA/OTP)
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Session management with device fingerprinting
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Complete audit logging for compliance
          </li>
        </ul>
      </div>
    </div>
  );
}
