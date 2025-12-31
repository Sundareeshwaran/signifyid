"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Book,
  Rocket,
  Box,
  KeyRound,
  Code2,
  Package,
  Shield,
  HelpCircle,
  ChevronRight,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  items?: { title: string; href: string }[];
}

const navigation: NavItem[] = [
  {
    title: "Introduction",
    href: "/docs",
    icon: Book,
  },
  {
    title: "Getting Started",
    href: "/docs/getting-started",
    icon: Rocket,
  },
  {
    title: "Product & Services",
    href: "/docs/product",
    icon: Box,
  },
  {
    title: "Client Authentication",
    href: "/docs/client-auth",
    icon: KeyRound,
  },
  {
    title: "API Reference",
    href: "/docs/api",
    icon: Code2,
  },
  {
    title: "SDK & Hooks",
    href: "/docs/sdk",
    icon: Package,
  },
  {
    title: "Security",
    href: "/docs/security",
    icon: Shield,
  },
  {
    title: "FAQ",
    href: "/docs/faq",
    icon: HelpCircle,
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ScrollArea className="h-full py-6">
      <nav className="px-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isParentActive =
            pathname.startsWith(item.href) && item.href !== "/docs";

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group",
                  isActive || isParentActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110",
                    isActive || isParentActive ? "" : "text-muted-foreground"
                  )}
                />
                <span className="flex-1">{item.title}</span>
                {item.items && (
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isParentActive && "rotate-90"
                    )}
                  />
                )}
              </Link>
              {item.items && isParentActive && (
                <div className="ml-6 mt-1 space-y-1 border-l pl-4">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition-colors",
                        pathname === subItem.href
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {subItem.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </ScrollArea>
  );
}

export function DocsSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-background/50 backdrop-blur-sm sticky top-0 h-screen">
        <div className="flex h-16 items-center border-b px-4 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <Link href="/docs" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Book className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Signify iD</span>
              <span className="text-xs text-muted-foreground">
                Documentation
              </span>
            </div>
          </Link>
        </div>
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-xl border-b z-40 flex items-center px-4 gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <VisuallyHidden>
              <SheetTitle>Navigation Menu</SheetTitle>
            </VisuallyHidden>
            <div className="flex h-16 items-center border-b px-4 bg-background/80 backdrop-blur-xl">
              <Link
                href="/docs"
                className="flex items-center gap-2"
                onClick={() => setOpen(false)}
              >
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Book className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Signify iD</span>
                  <span className="text-xs text-muted-foreground">
                    Documentation
                  </span>
                </div>
              </Link>
            </div>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link href="/docs" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Book className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Documentation</span>
        </Link>
      </div>
    </>
  );
}
