"use client";

import {
  MoreHorizontal,
  Edit,
  UserX,
  UserCheck,
  Shield,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Role,
  ROLE_DISPLAY_NAMES,
  ROLE_BADGE_VARIANTS,
  hasPermission,
} from "@/lib/rbac";

export interface UserData {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  roles: string[];
  mfaEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface RoleData {
  id: string;
  name: string;
  description?: string | null;
}

interface UsersTableProps {
  users: UserData[];
  currentUserRole: Role;
  availableRoles?: RoleData[];
  onViewDetails?: (user: UserData) => void;
  onEdit?: (user: UserData) => void;
  onDisable?: (user: UserData) => void;
  onEnable?: (user: UserData) => void;
  onDelete?: (user: UserData) => void;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: LucideIcon;
  }
> = {
  active: { label: "Active", variant: "default", icon: CheckCircle },
  disabled: { label: "Disabled", variant: "destructive", icon: XCircle },
  invited: { label: "Invited", variant: "outline", icon: Clock },
};

export function UsersTable({
  users,
  currentUserRole,
  availableRoles = [],
  onViewDetails,
  onEdit,
  onDisable,
  onEnable,
  onDelete,
}: UsersTableProps) {
  const canEdit = hasPermission(currentUserRole, "users:update");
  const canDisable = hasPermission(currentUserRole, "users:disable");
  const canDelete = hasPermission(currentUserRole, "users:delete");

  // Get display name for a role (supports both static and dynamic roles)
  const getRoleDisplayName = (roleName: string): string => {
    // First check if it's a known static role
    if (roleName in ROLE_DISPLAY_NAMES) {
      return ROLE_DISPLAY_NAMES[roleName as Role];
    }
    // Then check available roles from database
    const dbRole = availableRoles.find((r) => r.name === roleName);
    if (dbRole) {
      // Format role name: replace underscores with spaces and capitalize each word
      return roleName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    // Fallback: format the role name nicely
    return roleName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get badge variant for a role (supports both static and dynamic roles)
  const getRoleBadgeVariant = (
    roleName: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    // Check if it's a known static role
    if (roleName in ROLE_BADGE_VARIANTS) {
      return ROLE_BADGE_VARIANTS[roleName as Role];
    }
    // For custom/dynamic roles, use "secondary" as default
    return "secondary";
  };

  // Get initials for avatar
  const getInitials = (name: string | null, email: string) => {
    const displayName = name || email.split("@")[0];
    return displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>MFA</TableHead>
            <TableHead>Last Login</TableHead>
            {(canEdit || canDisable || canDelete) && (
              <TableHead className="w-[70px]">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            // Get the display role (first role from the array, or 'user' as fallback)
            const displayRole = user.roles.length > 0 ? user.roles[0] : "user";
            // getPrimaryRole is still used internally for permission checks
            const statusConfig =
              STATUS_CONFIG[user.status] || STATUS_CONFIG.active;
            const StatusIcon = statusConfig.icon;

            return (
              <TableRow
                key={user.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onViewDetails?.(user)}
              >
                {/* User Info */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(user.displayName, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {user.displayName || user.email.split("@")[0]}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell>
                  <Badge
                    variant={getRoleBadgeVariant(displayRole)}
                    className="font-normal"
                  >
                    {getRoleDisplayName(displayRole)}
                  </Badge>
                  {user.roles.length > 1 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      +{user.roles.length - 1}
                    </span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge
                    variant={statusConfig.variant}
                    className="flex items-center gap-1 w-fit"
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </Badge>
                </TableCell>

                {/* MFA Status */}
                <TableCell>
                  {user.mfaEnabled ? (
                    <Badge variant="secondary" className="text-green-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Disabled
                    </Badge>
                  )}
                </TableCell>

                {/* Last Login */}
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(user.lastLoginAt)}
                </TableCell>

                {/* Actions */}
                {(canEdit || canDisable || canDelete) && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onViewDetails?.(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => onEdit?.(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                        )}
                        {canDisable && user.status === "disabled" && (
                          <DropdownMenuItem onClick={() => onEnable?.(user)}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Enable User
                          </DropdownMenuItem>
                        )}
                        {canDisable && user.status !== "disabled" && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDisable?.(user)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Disable User
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive font-semibold"
                              onClick={() => onDelete?.(user)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User (Permanent)
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
