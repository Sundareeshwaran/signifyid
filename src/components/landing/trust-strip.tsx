"use client";

import { CheckCircle, Shield, Globe, Clock } from "lucide-react";
import { useScrollReveal, useStaggeredReveal } from "@/hooks/use-gsap";

const trustItems = [
  { icon: Shield, label: "SOC 2 Type II", description: "Compliant" },
  { icon: Clock, label: "99.99%", description: "Uptime SLA" },
  { icon: Globe, label: "GDPR & CCPA", description: "Ready" },
  { icon: CheckCircle, label: "24/7", description: "Support" },
];

const stats = [
  { value: "10K+", label: "Organizations" },
  { value: "50M+", label: "Authentications / mo" },
  { value: "99.99%", label: "Uptime" },
  { value: "<50ms", label: "Avg Response" },
];

export function TrustStrip() {
  const titleRef = useScrollReveal<HTMLDivElement>({ y: 20, duration: 0.5 });
  const statsRef = useStaggeredReveal<HTMLDivElement>("[data-stat]", {
    y: 20,
    stagger: 0.1,
  });
  const badgesRef = useStaggeredReveal<HTMLDivElement>("[data-badge]", {
    y: 15,
    stagger: 0.08,
  });

  return (
    <section className="border-y bg-muted/30 backdrop-blur-sm py-12 lg:py-16">
      <div className="container mx-auto px-4">
        {/* Title */}
        <div ref={titleRef} className="text-center mb-10">
          <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase mb-2">
            Trusted by teams building secure applications
          </p>
        </div>

        {/* Stats Row */}
        <div
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 max-w-4xl mx-auto mb-10"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              data-stat
              className="text-center p-4 rounded-2xl bg-background/50 border border-border/50"
            >
              <p className="text-3xl lg:text-4xl font-bold text-primary mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div
          ref={badgesRef}
          className="flex flex-wrap items-center justify-center gap-4 lg:gap-6"
        >
          {trustItems.map((item) => (
            <div
              key={item.label}
              data-badge
              className="flex items-center gap-3 bg-background/80 border border-border/50 rounded-full px-5 py-2.5 hover:bg-accent/50 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold leading-tight">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
