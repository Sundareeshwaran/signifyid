"use client";

import dynamic from "next/dynamic";
import { HeroSection, TrustStrip } from "@/components/landing";

// Lazy load below-the-fold sections to reduce initial bundle size
const FeaturesSection = dynamic(
  () =>
    import("@/components/landing/features-section").then(
      (mod) => mod.FeaturesSection
    ),
  { ssr: true }
);

const HowItWorksSection = dynamic(
  () =>
    import("@/components/landing/how-it-works-section").then(
      (mod) => mod.HowItWorksSection
    ),
  { ssr: true }
);

const SecuritySection = dynamic(
  () =>
    import("@/components/landing/security-section").then(
      (mod) => mod.SecuritySection
    ),
  { ssr: true }
);

const DeveloperSection = dynamic(
  () =>
    import("@/components/landing/developer-section").then(
      (mod) => mod.DeveloperSection
    ),
  { ssr: true }
);

const TestimonialsSection = dynamic(
  () =>
    import("@/components/landing/testimonials-section").then(
      (mod) => mod.TestimonialsSection
    ),
  { ssr: true }
);

const CTASection = dynamic(
  () =>
    import("@/components/landing/cta-section").then((mod) => mod.CTASection),
  { ssr: true }
);

const LandingFooter = dynamic(
  () =>
    import("@/components/landing/landing-footer").then(
      (mod) => mod.LandingFooter
    ),
  { ssr: true }
);

/**
 * Landing Page
 *
 * The main marketing page for Signify iD, featuring:
 * - Hero section with animated entrance and grid background
 * - Trust & credibility strip with statistics
 * - Core features in bento grid layout
 * - How it works timeline
 * - Security emphasis section
 * - Developer-friendly section
 * - Testimonials marquee
 * - Call to action
 * - Footer
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <TrustStrip />
      <FeaturesSection />
      <HowItWorksSection />
      <SecuritySection />
      <DeveloperSection />
      <TestimonialsSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
