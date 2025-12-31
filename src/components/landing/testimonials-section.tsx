"use client";

import { Marquee } from "@/components/ui/marquee";
import { useScrollReveal } from "@/hooks/use-gsap";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CTO",
    company: "TechFlow Inc.",
    content:
      "Signify iD transformed our identity management. The OAuth2 integration was seamless, and our security posture improved dramatically.",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Security Lead",
    company: "SecureStack",
    content:
      "The best identity solution we've used. MFA implementation took hours instead of weeks. Highly recommend for any enterprise.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "VP Engineering",
    company: "DataCore",
    content:
      "Our developers love the clean APIs. Integration was smooth and the documentation is excellent. A game-changer for our auth flow.",
    rating: 5,
  },
  {
    name: "David Kim",
    role: "Founder",
    company: "StartupLabs",
    content:
      "From zero to fully secured in days. The RBAC system is incredibly flexible and the audit logs give us complete visibility.",
    rating: 5,
  },
  {
    name: "Alexandra Peters",
    role: "DevOps Manager",
    company: "CloudNine",
    content:
      "99.99% uptime is no joke. Signify iD has been rock solid for our mission-critical applications. The team is also very responsive.",
    rating: 5,
  },
  {
    name: "James Wilson",
    role: "Head of IT",
    company: "EnterpriseCo",
    content:
      "Migrated 50,000 users without a single issue. The multi-tenant architecture perfectly fits our complex organization structure.",
    rating: 5,
  },
];

const firstRow = testimonials.slice(0, 3);
const secondRow = testimonials.slice(3, 6);

function TestimonialCard({
  testimonial,
}: {
  testimonial: (typeof testimonials)[0];
}) {
  const initials = testimonial.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <figure className="relative w-80 cursor-pointer overflow-hidden rounded-xl border bg-card p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Quote icon - subtle */}
      <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />

      {/* Stars */}
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-primary text-primary" />
        ))}
      </div>

      {/* Content */}
      <blockquote className="text-sm text-muted-foreground leading-relaxed mb-4">
        &ldquo;{testimonial.content}&rdquo;
      </blockquote>

      {/* Author */}
      <figcaption className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{initials}</span>
        </div>
        <div className="flex flex-col">
          <p className="font-semibold text-sm">{testimonial.name}</p>
          <p className="text-xs text-muted-foreground">
            {testimonial.role}, {testimonial.company}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

export function TestimonialsSection() {
  const titleRef = useScrollReveal<HTMLDivElement>({ y: 30 });

  return (
    <section className="py-20 md:py-28 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div ref={titleRef} className="text-center mb-10 lg:mb-14">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Star className="h-4 w-4 fill-primary" />
            Testimonials
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
            Loved by <span className="text-shimmer">security teams</span>{" "}
            worldwide
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of organizations that trust Signify iD for their
            identity management needs.
          </p>
        </div>
      </div>

      {/* Marquee Container */}
      <div className="relative">
        {/* First Row */}
        <Marquee pauseOnHover className="[--duration:40s] [--gap:1.5rem]">
          {firstRow.map((testimonial) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} />
          ))}
        </Marquee>

        {/* Second Row - Reverse */}
        <Marquee
          pauseOnHover
          reverse
          className="[--duration:40s] [--gap:1.5rem] mt-4"
        >
          {secondRow.map((testimonial) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
