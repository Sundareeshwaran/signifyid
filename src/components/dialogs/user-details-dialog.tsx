"use client";

import {
  User,
  Mail,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    status: string;
    roles: string[];
    mfaEnabled: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    activeSessionsCount?: number;
  } | null;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: any;
  }
> = {
  active: { label: "Active", variant: "default", icon: CheckCircle },
  disabled: { label: "Disabled", variant: "destructive", icon: XCircle },
  invited: { label: "Invited", variant: "outline", icon: Clock },
};

export function UserDetailsDialog({
  open,
  onOpenChange,
  user,
}: UserDetailsDialogProps) {
  if (!user) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const statusConfig = STATUS_CONFIG[user.status] || STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <span className="block">{user.displayName || "User"}</span>
              <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            User details for {user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Account Status</span>
            <Badge
              variant={statusConfig.variant}
              className="flex items-center gap-1"
            >
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Assigned Roles
            </label>
            <div className="flex flex-wrap gap-2">
              {user.roles.length > 0 ? (
                [...new Set(user.roles)].map((role, index) => (
                  <Badge key={`${role}-${index}`} variant="secondary">
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No roles assigned
                </span>
              )}
            </div>
          </div>

          {/* MFA Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Multi-Factor Authentication
              </span>
            </div>
            <Badge variant={user.mfaEnabled ? "default" : "outline"}>
              {user.mfaEnabled ? "Enabled" : "Not Configured"}
            </Badge>
          </div>

          {/* Active Sessions */}
          {user.activeSessionsCount !== undefined && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Active Sessions</span>
              <Badge variant="secondary">
                {user.activeSessionsCount} active
              </Badge>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Created
              </label>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(user.createdAt)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Last Login
              </label>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {formatDate(user.lastLoginAt)}
              </div>
            </div>
          </div>

          {/* User ID */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              User ID
            </label>
            <code className="block text-xs bg-muted px-2 py-1 rounded font-mono">
              {user.id}
            </code>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
