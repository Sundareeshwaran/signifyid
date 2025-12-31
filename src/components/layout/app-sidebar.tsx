"use client";

/**
 * App Sidebar Component
 *
 * Main sidebar using shadcn sidebar-07 pattern with RBAC-aware navigation.
 * Uses the existing NAVIGATION_ITEMS from rbac.ts to preserve original nav structure.
 */

import * as React from "react";
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
  User,
  Settings,
  Workflow,
  Building2,
  LogOut,
  ChevronsUpDown,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Role,
  ROLE_DISPLAY_NAMES,
  ROLE_BADGE_VARIANTS,
  NAVIGATION_ITEMS,
  NavItem,
} from "@/lib/rbac";
import { authApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

// Icon mapping from string to LucideIcon
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

// Navigation group configuration (preserving original structure)
const NAV_GROUPS = [
  { key: "overview", label: "Overview" },
  { key: "security", label: "Identity & Access" },
  { key: "activity", label: "Activity & Logs" },
  { key: "billing", label: "Billing" },
  { key: "settings", label: "Settings" },
] as const;

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

// ============================================
// Props Interfaces
// ============================================

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatar?: string;
  } | null;
  currentRole: Role;
  organizationName: string;
  permissions: string[];
  isLoading?: boolean;
}

// ============================================
// Sidebar Header Component
// ============================================

function SidebarOrgHeader({
  organizationName,
  isLoading,
}: {
  organizationName: string;
  isLoading?: boolean;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-2 py-1.5">
        <Skeleton className="h-8 w-8 rounded-lg" />
        {!isCollapsed && (
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        )}
      </div>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="cursor-default hover:bg-transparent"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{organizationName}</span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              @Signify iD
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// ============================================
// Navigation Group Component
// ============================================

function NavGroup({
  groupLabel,
  items,
  isLoading,
}: {
  groupLabel: string;
  items: NavItem[];
  isLoading?: boolean;
}) {
  const pathname = usePathname();

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {[1, 2, 3].map((i) => (
              <SidebarMenuItem key={i}>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = ICONS[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={cn(
                    isActive &&
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  )}
                >
                  <Link href={item.href}>
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isActive && "text-primary-foreground"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// ============================================
// User Footer Component
// ============================================

function NavUserFooter({
  user,
  currentRole,
  isLoading,
}: {
  user: AppSidebarProps["user"];
  currentRole: Role;
  isLoading?: boolean;
}) {
  const router = useRouter();
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleLogout = async () => {
    await authApi.logout();
    router.push("/login");
  };

  if (isLoading || !user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            {!isCollapsed && (
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            )}
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const initials = user.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.displayName} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.displayName}</span>
                <Badge
                  variant={ROLE_BADGE_VARIANTS[currentRole]}
                  className="w-fit text-[10px] px-1.5 py-0"
                >
                  {ROLE_DISPLAY_NAMES[currentRole]}
                </Badge>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.displayName} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.displayName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// ============================================
// Main AppSidebar Component
// ============================================

export function AppSidebar({
  user,
  currentRole,
  organizationName,
  permissions,
  isLoading = false,
  ...props
}: AppSidebarProps) {
  // Filter navigation items based on permissions
  const visibleItems = React.useMemo(
    () =>
      NAVIGATION_ITEMS.filter((item) =>
        hasAnyPermission(permissions, item.requiredPermissions)
      ),
    [permissions]
  );

  // Group items by category
  const groupedItems = React.useMemo(() => {
    return visibleItems.reduce((acc, item) => {
      if (!acc[item.group]) {
        acc[item.group] = [];
      }
      acc[item.group].push(item);
      return acc;
    }, {} as Record<string, NavItem[]>);
  }, [visibleItems]);

  // Get ordered groups that have items
  const orderedGroups = React.useMemo(
    () =>
      NAV_GROUPS.filter(
        (group) => groupedItems[group.key] && groupedItems[group.key].length > 0
      ),
    [groupedItems]
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarOrgHeader
          organizationName={organizationName}
          isLoading={isLoading}
        />
      </SidebarHeader>

      <SidebarContent>
        {orderedGroups.map((group) => (
          <NavGroup
            key={group.key}
            groupLabel={group.label}
            items={groupedItems[group.key]}
            isLoading={isLoading}
          />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUserFooter
          user={user}
          currentRole={currentRole}
          isLoading={isLoading}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
