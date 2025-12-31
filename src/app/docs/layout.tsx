import type { Metadata } from "next";
import { DocsSidebar } from "@/components/docs";

export const metadata: Metadata = {
  title: "Documentation | Signify iD",
  description:
    "Learn how to integrate Signify iD for secure identity management, authentication, and access control.",
  openGraph: {
    title: "Signify iD Documentation",
    description: "Developer documentation for Signify iD identity platform",
    type: "website",
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <DocsSidebar />
        <main className="flex-1 min-w-0 relative pt-14 lg:pt-0">
          {/* Top blur gradient overlay - desktop only */}
          <div className="hidden lg:block fixed top-0 left-64 right-0 h-14 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-10 backdrop-blur-sm" />
          <div className="container max-w-4xl mx-auto px-6 py-8 lg:px-8 lg:py-16 relative z-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
