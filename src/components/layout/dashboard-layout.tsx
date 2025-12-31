"use client";

/**
 * Dashboard Layout
 *
 * Main layout component using shadcn sidebar-07 pattern.
 * Provides the navigation shell for all dashboard pages.
 */

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { NotificationPanel } from "@/components/notification-panel";
import { NotificationProvider } from "@/hooks/useNotifications";
import { PermissionProvider } from "@/components/providers/permission-context";
import { Role } from "@/lib/rbac";
import { authApi, settingsApi } from "@/lib/api";
import { CommandSearch } from "@/components/command-search";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  orgId: string;
  roles: string[];
  permissions: string[];
}

// Breadcrumb configuration based on pathname
function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href?: string }[] = [];

  // Map segments to readable labels
  const labelMap: Record<string, string> = {
    dashboard: "Dashboard",
    users: "Users",
    clients: "Applications",
    workflows: "Workflows",
    roles: "Roles & Permissions",
    fingerprinting: "Fingerprinting",
    sessions: "Sessions",
    analytics: "Analytics",
    logs: "Audit Logs",
    billing: "Billing",
    settings: "Settings",
    profile: "Profile",
    builder: "Builder",
  };

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Skip UUIDs in breadcrumbs (just show parent)
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        segment
      );

    if (!isUuid) {
      breadcrumbs.push({
        label:
          labelMap[segment] ||
          segment.charAt(0).toUpperCase() + segment.slice(1),
        href: isLast ? undefined : currentPath,
      });
    }
  });

  return breadcrumbs;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<Role>("user");
  const [orgName, setOrgName] = useState<string>("My Organization");

  const breadcrumbs = getBreadcrumbs(pathname);

  // Fetch current user on mount
  useEffect(() => {
    async function fetchUser() {
      const result = await authApi.me();

      if (result.error || !result.data) {
        // Not authenticated - redirect to login
        router.push("/login");
        return;
      }

      setUser(result.data);

      // Set role from user's roles
      if (result.data && result.data.roles.length > 0) {
        // Use the highest privilege role
        const roleHierarchy: Role[] = [
          "super_admin",
          "tenant_admin",
          "security_admin",
          "developer",
          "user",
        ];
        const roles = result.data.roles;
        const userRole = roleHierarchy.find((r) => roles.includes(r)) || "user";
        setCurrentRole(userRole);
      }

      // Fetch organization name
      const orgResult = await settingsApi.getOrganization();
      if (orgResult.data) {
        setOrgName(orgResult.data.name);
      }

      setLoading(false);
    }

    fetchUser();
  }, [router]);

  // Loading state - full screen loader
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <NotificationProvider>
      <PermissionProvider permissions={user.permissions} roles={user.roles}>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar
            user={{
              id: user.id,
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0],
            }}
            currentRole={currentRole}
            organizationName={orgName}
            permissions={user.permissions}
            isLoading={loading}
          />

          <SidebarInset>
            {/* Header */}
            <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />

                {/* Breadcrumbs */}
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <React.Fragment key={index}>
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {crumb.href ? (
                            <BreadcrumbLink asChild>
                              <Link href={crumb.href}>{crumb.label}</Link>
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="hidden md:block">
                  <CommandSearch />
                </div>

                <ThemeToggle />

                {/* Notifications */}
                <NotificationPanel />
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </PermissionProvider>
    </NotificationProvider>
  );
}
