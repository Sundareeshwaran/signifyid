"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/use-gsap";

export function CTASection() {
  const ref = useScrollReveal<HTMLDivElement>({ y: 40, duration: 0.6 });

  return (
    <section className="py-24 md:py-32 lg:py-40">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className="relative max-w-5xl mx-auto rounded-[2.5rem] overflow-hidden"
        >
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-chart-2 to-primary" />

          {/* Animated Glow Effects */}
          <div className="absolute inset-0">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/25 rounded-full blur-3xl animate-pulse-glow" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/15 rounded-full blur-3xl animate-pulse-glow" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-white/10 rounded-full blur-3xl" />
          </div>

          {/* Pattern Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15)_0%,transparent_50%)]" />

          {/* Content */}
          <div className="relative px-8 py-16 md:px-16 md:py-20 lg:py-24 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              Start for Free
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 tracking-tight">
              Ready to secure your organization?
            </h2>
            <p className="text-white/85 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Get started with Signify iD today. No credit card required. Full
              access to all features for 14 days.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-lg px-10 h-16 bg-white text-primary hover:bg-white/95 shadow-xl shadow-black/10 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 font-semibold"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-lg px-10 h-16 text-white hover:bg-white/15 border-2 border-white/40 font-semibold"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-white/70 text-sm">
              <span>✓ No credit card required</span>
              <span>✓ 14-day free trial</span>
              <span>✓ Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
