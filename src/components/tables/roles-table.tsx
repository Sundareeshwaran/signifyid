"use client";

import { Info, CheckCircle, XCircle } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RoleDefinition } from "@/lib/mock-data";
import { Permission, ROLE_BADGE_VARIANTS } from "@/lib/rbac";

interface RolesTableProps {
  roles: RoleDefinition[];
}

// Group permissions by category for display
const PERMISSION_GROUPS: Record<string, { label: string; permissions: Permission[] }> = {
  users: {
    label: "Users",
    permissions: ["users:read", "users:create", "users:update", "users:delete"],
  },
  clients: {
    label: "Applications",
    permissions: ["clients:read", "clients:create", "clients:update", "clients:delete"],
  },
  roles: {
    label: "Roles",
    permissions: ["roles:read", "roles:manage"],
  },
  logs: {
    label: "Logs",
    permissions: ["logs:read"],
  },
  billing: {
    label: "Billing",
    permissions: ["billing:read", "billing:manage"],
  },
  org: {
    label: "Organization",
    permissions: ["org:read", "org:manage"],
  },
};

// Short labels for individual permissions
const PERMISSION_LABELS: Record<string, string> = {
  "users:read": "View",
  "users:create": "Create",
  "users:update": "Edit",
  "users:delete": "Delete",
  "clients:read": "View",
  "clients:create": "Create",
  "clients:update": "Edit",
  "clients:delete": "Delete",
  "roles:read": "View",
  "roles:manage": "Manage",
  "logs:read": "View",
  "billing:read": "View",
  "billing:manage": "Manage",
  "org:read": "View",
  "org:manage": "Manage",
};

export function RolesTable({ roles }: RolesTableProps) {
  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Role</TableHead>
              {Object.entries(PERMISSION_GROUPS).map(([key, group]) => (
                <TableHead key={key} className="text-center min-w-[100px]">
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1">
                      {group.label}
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {group.permissions.map(p => PERMISSION_LABELS[p]).join(", ")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
              <TableHead className="text-center">Users</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                {/* Role Info */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={ROLE_BADGE_VARIANTS[role.id]} className="font-normal">
                        {role.name}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {role.description}
                    </span>
                  </div>
                </TableCell>

                {/* Permission Groups */}
                {Object.entries(PERMISSION_GROUPS).map(([key, group]) => {
                  const hasAllPermissions = group.permissions.every(p =>
                    role.permissions.includes(p)
                  );
                  const hasSomePermissions = group.permissions.some(p =>
                    role.permissions.includes(p)
                  );
                  const permissionCount = group.permissions.filter(p =>
                    role.permissions.includes(p)
                  ).length;

                  return (
                    <TableCell key={key} className="text-center">
                      {hasAllPermissions ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Full access</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : hasSomePermissions ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              {permissionCount}/{group.permissions.length}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {group.permissions
                                .filter(p => role.permissions.includes(p))
                                .map(p => PERMISSION_LABELS[p])
                                .join(", ")}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                  );
                })}

                {/* User Count */}
                <TableCell className="text-center">
                  <Badge variant="secondary">{role.userCount}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
