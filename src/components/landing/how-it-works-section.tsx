"use client";

import {
  Building2,
  Settings,
  ShieldCheck,
  Activity,
  ArrowRight,
} from "lucide-react";
import { useTimelineAnimation, useScrollReveal } from "@/hooks/use-gsap";

const steps = [
  {
    icon: Building2,
    number: "01",
    title: "Create Organization",
    description:
      "Set up your organization in minutes with intuitive onboarding. Define your branding and policies.",
  },
  {
    icon: Settings,
    number: "02",
    title: "Configure Clients",
    description:
      "Register your applications and configure OAuth2 clients with just a few clicks.",
  },
  {
    icon: ShieldCheck,
    number: "03",
    title: "Secure Access",
    description:
      "Define roles, permissions, and enable multi-factor authentication for your team.",
  },
  {
    icon: Activity,
    number: "04",
    title: "Monitor & Control",
    description:
      "Track sessions, review audit logs, and manage access with real-time analytics.",
  },
];

export function HowItWorksSection() {
  const titleRef = useScrollReveal<HTMLDivElement>({ y: 30 });
  const ref = useTimelineAnimation<HTMLDivElement>(
    "[data-step]",
    "[data-timeline-line]"
  );

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div ref={titleRef} className="text-center mb-16 lg:mb-20">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Activity className="h-4 w-4" />
            How It Works
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 tracking-tight">
            Get started in{" "}
            <span className="text-shimmer">minutes, not months</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to secure your applications with enterprise-grade
            identity management.
          </p>
        </div>

        {/* Steps - Horizontal on Desktop */}
        <div ref={ref} className="max-w-6xl mx-auto">
          {/* Desktop Layout - Horizontal */}
          <div className="hidden lg:block relative">
            {/* Connector Line */}
            <div
              data-timeline-line
              className="absolute top-[3.5rem] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20"
            />

            <div className="grid grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <div key={step.number} data-step className="relative pt-4">
                  {/* Number Badge on Line */}
                  <div className="absolute top-[1.25rem] left-1/2 -translate-x-1/2 z-10">
                    <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-mono font-bold text-lg shadow-lg shadow-primary/25">
                      {step.number}
                    </div>
                  </div>

                  {/* Arrow between steps */}
                  {index < steps.length - 1 && (
                    <div className="absolute top-[2.4rem] right-0 translate-x-1/2 z-10 hidden xl:block">
                      <ArrowRight className="h-5 w-5 text-primary/40" />
                    </div>
                  )}

                  {/* Card */}
                  <div className="mt-20 p-6 rounded-3xl border bg-card card-premium text-center">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile/Tablet Layout - Vertical */}
          <div className="lg:hidden relative">
            {/* Vertical Line */}
            <div
              data-timeline-line
              className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary to-primary/20"
            />

            <div className="space-y-6">
              {steps.map((step) => (
                <div
                  key={step.number}
                  data-step
                  className="relative flex gap-6 md:gap-8"
                >
                  {/* Number Badge */}
                  <div className="relative z-10 shrink-0">
                    <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-mono font-bold text-sm md:text-base shadow-lg shadow-primary/25">
                      {step.number}
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 p-5 md:p-6 rounded-2xl border bg-card card-premium">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <step.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
