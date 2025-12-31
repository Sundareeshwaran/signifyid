"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  AppWindow,
  BarChart3,
  Fingerprint,
  Shield,
  Monitor,
  FileText,
  CreditCard,
  LogOut,
  Settings,
  Building2,
  LucideIcon,
  User,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Role,
  ROLE_DISPLAY_NAMES,
  NAVIGATION_ITEMS,
  NavItem,
} from "@/lib/rbac";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  AppWindow,
  BarChart3,
  Fingerprint,
  Shield,
  Monitor,
  FileText,
  CreditCard,
  User,
  Settings,
  Workflow,
};

// Navigation groups (order matters)
const NAV_GROUP_ORDER = [
  "overview",
  "security",
  "activity",
  "billing",
  "settings",
];
const NAV_GROUP_TITLES: Record<string, string> = {
  overview: "Overview",
  security: "Security",
  activity: "Activity & Logs",
  billing: "Billing",
  settings: "Settings",
};

/**
 * Check if user has any of the required permissions (with wildcard support)
 */
function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  if (requiredPermissions.length === 0) return true;
  if (userPermissions.includes("*")) return true;

  return requiredPermissions.some((required) => {
    if (userPermissions.includes(required)) return true;
    const [resource] = required.split(":");
    return userPermissions.includes(`${resource}:*`);
  });
}

interface SidebarProps {
  currentRole: Role;
  organizationName: string;
  permissions: string[];
  userName?: string;
}

export function Sidebar({
  currentRole,
  organizationName,
  permissions,
  userName,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  void setIsCollapsed; // Collapse functionality to be implemented

  const handleLogout = async () => {
    await authApi.logout();
    router.push("/login");
  };

  // Filter navigation items based on permissions
  const visibleItems = NAVIGATION_ITEMS.filter((item) =>
    hasAnyPermission(permissions, item.requiredPermissions)
  );

  // Group items by category
  const groupedItems = visibleItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  // Get ordered groups that have items
  const orderedGroups = NAV_GROUP_ORDER.filter(
    (group) => groupedItems[group] && groupedItems[group].length > 0
  );

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar h-screen transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Organization Header */}
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          <Building2 className="h-5 w-5" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="font-semibold text-sidebar-foreground truncate">
              {organizationName}
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Signify iD
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-3">
          {orderedGroups.map((group) => (
            <div key={group} className="mb-6">
              {/* Section Header */}
              {!isCollapsed && (
                <h3 className="mb-2 px-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                  {NAV_GROUP_TITLES[group]}
                </h3>
              )}

              {/* Section Items */}
              <ul className="space-y-1">
                {groupedItems[group].map((item) => {
                  const Icon = ICONS[item.icon] || LayoutDashboard;
                  const isActive = pathname === item.href;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 flex-shrink-0",
                            isActive ? "text-primary-foreground" : ""
                          )}
                        />
                        {!isCollapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {userName || "User"}
              </p>
              <Badge variant="outline" className="text-xs mt-0.5">
                {ROLE_DISPLAY_NAMES[currentRole]}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
