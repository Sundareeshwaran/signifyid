"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Users,
  AppWindow,
  BarChart3,
  Fingerprint,
  Shield,
  Monitor,
  FileText,
  CreditCard,
  Settings,
  Workflow,
  User,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "Navigation",
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: Users,
    group: "Navigation",
  },
  {
    title: "Applications",
    href: "/dashboard/clients",
    icon: AppWindow,
    group: "Navigation",
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    group: "Navigation",
  },
  {
    title: "Fingerprinting",
    href: "/dashboard/fingerprinting",
    icon: Fingerprint,
    group: "Security",
  },
  {
    title: "Roles & Permissions",
    href: "/dashboard/roles",
    icon: Shield,
    group: "Security",
  },
  {
    title: "Sessions",
    href: "/dashboard/sessions",
    icon: Monitor,
    group: "Security",
  },
  {
    title: "Audit Logs",
    href: "/dashboard/logs",
    icon: FileText,
    group: "Activity",
  },
  {
    title: "Workflows",
    href: "/dashboard/workflows",
    icon: Workflow,
    group: "Activity",
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    group: "Settings",
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: User,
    group: "Settings",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    group: "Settings",
  },
];

export function CommandSearch() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  // Keyboard shortcut to open command palette
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  // Group items by category
  const groupedItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof navigationItems>);

  return (
    <>
      {/* Search Trigger Button */}
      <Button
        variant="outline"
        className="relative h-9 w-48 lg:w-64 justify-start text-sm text-muted-foreground bg-muted/50 border-border/50 hover:bg-muted hover:text-foreground transition-colors"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="lg:hidden">Search</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          Ctrl+K
        </kbd>
      </Button>

      {/* Command Dialog */}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search for pages, settings, and more..."
      >
        <CommandInput placeholder="Type to search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {Object.entries(groupedItems).map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.title}
                  onSelect={() => handleSelect(item.href)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                  {item.title === "Dashboard" && (
                    <CommandShortcut>Ctrl+D</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
