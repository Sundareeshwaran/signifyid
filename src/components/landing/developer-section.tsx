"use client";

import { Code2, Package, Terminal, FileCode, Braces } from "lucide-react";
import { useScrollReveal, useStaggeredReveal } from "@/hooks/use-gsap";

const developerFeatures = [
  {
    icon: Code2,
    title: "API-First Design",
    description:
      "RESTful APIs with comprehensive documentation for seamless integration.",
  },
  {
    icon: Package,
    title: "SDKs & Libraries",
    description:
      "Official SDKs for popular languages and frameworks (coming soon).",
  },
  {
    icon: Terminal,
    title: "Local Development",
    description:
      "Developer-friendly local setup with hot reload and debugging tools.",
  },
];

const codeExample = `// Authenticate with Signify iD
const response = await fetch('/api/auth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: 'your-client-id',
    client_secret: 'your-client-secret',
    scope: 'read write',
  }),
});

const { access_token } = await response.json();`;

export function DeveloperSection() {
  const titleRef = useScrollReveal<HTMLDivElement>({ y: 30 });
  const codeRef = useScrollReveal<HTMLDivElement>({
    x: -40,
    y: 0,
    duration: 0.5,
  });
  const featuresRef = useStaggeredReveal<HTMLDivElement>("[data-dev-feature]", {
    y: 30,
    stagger: 0.1,
  });

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div ref={titleRef} className="text-center mb-16 lg:mb-20">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Braces className="h-4 w-4" />
            Developer Experience
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 tracking-tight">
            Built for <span className="text-shimmer">developers</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Clean APIs, comprehensive docs, and intuitive SDKs for a seamless
            developer experience.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Code Block */}
          <div ref={codeRef} className="order-2 lg:order-1 w-full min-w-0">
            <div className="rounded-2xl lg:rounded-3xl border bg-zinc-950 dark:bg-zinc-900/80 overflow-hidden shadow-2xl max-w-full">
              {/* Window Header */}
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 border-b border-zinc-800 bg-zinc-900/80 dark:bg-zinc-950/80">
                <div className="flex gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex items-center gap-2 text-zinc-500 text-xs sm:text-sm font-mono">
                  <FileCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  auth.ts
                </div>
              </div>
              {/* Code Content */}
              <div className="overflow-x-auto">
                <pre className="p-4 sm:p-6 text-xs sm:text-sm leading-relaxed">
                  <code className="text-zinc-300 font-mono whitespace-pre">
                    {codeExample}
                  </code>
                </pre>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div ref={featuresRef} className="order-1 lg:order-2 space-y-4">
            {developerFeatures.map((feature) => (
              <div
                key={feature.title}
                data-dev-feature
                className="flex gap-4 p-5 rounded-2xl bg-background/50 border border-border/50 card-premium"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
