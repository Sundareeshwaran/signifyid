"use client";

import { ShieldCheck, KeyRound, FileSearch, Shield } from "lucide-react";
import { useStaggeredReveal, useScrollReveal } from "@/hooks/use-gsap";

const securityFeatures = [
  {
    icon: ShieldCheck,
    title: "Zero Trust Architecture",
    description:
      "Never trust, always verify. Every request is authenticated and authorized regardless of origin.",
    highlight: "Industry Standard",
  },
  {
    icon: KeyRound,
    title: "Session-Based Security",
    description:
      "Secure session management with automatic expiration, device fingerprinting, and anomaly detection.",
    highlight: "AI-Powered",
  },
  {
    icon: FileSearch,
    title: "Audit & Compliance",
    description:
      "Complete audit trail of all authentication events, permission changes, and administrative actions.",
    highlight: "SOC 2 Ready",
  },
];

export function SecuritySection() {
  const titleRef = useScrollReveal<HTMLDivElement>({ y: 30 });
  const cardsRef = useStaggeredReveal<HTMLDivElement>("[data-security-card]", {
    y: 40,
    stagger: 0.12,
  });

  return (
    <section className="py-24 md:py-32 lg:py-40 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08)_0%,transparent_60%)]" />
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div ref={titleRef} className="text-center mb-16 lg:mb-20">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Enterprise Security
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 tracking-tight">
            Security at <span className="text-shimmer">every layer</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Built with security-first principles to protect your
            organization&apos;s most critical assets.
          </p>
        </div>

        {/* Security Cards */}
        <div
          ref={cardsRef}
          className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto"
        >
          {securityFeatures.map((feature) => (
            <div
              key={feature.title}
              data-security-card
              className="relative p-8 lg:p-10 rounded-3xl border bg-card/80 backdrop-blur-sm card-premium group"
            >
              {/* Highlight Badge */}
              <div className="absolute top-6 right-6">
                <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {feature.highlight}
                </span>
              </div>

              {/* Icon */}
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/15 to-transparent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-8 w-8 text-primary" />
              </div>

              {/* Content */}
              <h3 className="font-semibold text-xl mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Decorative gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded-b-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
