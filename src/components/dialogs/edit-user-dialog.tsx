"use client";

import { useState, useEffect } from "react";
import { Loader2, Edit, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usersApi, rolesApi } from "@/lib/api";
import { getPrimaryRole } from "@/lib/rbac";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    status: string;
    roles: string[];
    mfaEnabled: boolean;
  } | null;
  onSuccess: () => void;
  canManageMfa?: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
  canManageMfa = false,
}: EditUserDialogProps) {
  // Initialize form state directly from props to avoid cascading renders
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [status, setStatus] = useState(user?.status || "active");
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [resettingMfa, setResettingMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Track when user/open changes to reset form state
  const [prevUser, setPrevUser] = useState(user);
  const [prevOpen, setPrevOpen] = useState(open);

  // Sync form state when user or open changes (using functional update pattern)
  if (user !== prevUser || open !== prevOpen) {
    setPrevUser(user);
    setPrevOpen(open);
    if (user && open) {
      setDisplayName(user.displayName || "");
      setStatus(user.status);
    }
  }

  // Fetch roles and set selected role when dialog opens
  useEffect(() => {
    // Skip if dialog not open or no user
    if (!user || !open) return;

    let cancelled = false;

    const loadRolesAndSetSelected = async () => {
      setLoadingRoles(true);
      try {
        const result = await rolesApi.list();
        if (cancelled) return;

        if (result.data) {
          const roles = result.data.roles;
          setAvailableRoles(roles);

          // Find role ID from user's role name
          // First, try to find any of the user's roles in the available roles
          // This supports both system and custom roles
          let roleRecord = null;
          for (const roleName of user.roles) {
            roleRecord = roles.find((r) => r.name === roleName);
            if (roleRecord) break;
          }
          // Fallback to the primary system role if no match found
          if (!roleRecord) {
            const userRoleName = getPrimaryRole(user.roles);
            roleRecord = roles.find((r) => r.name === userRoleName);
          }
          if (roleRecord) {
            setSelectedRole(roleRecord.id);
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingRoles(false);
        }
      }
    };

    loadRolesAndSetSelected();

    return () => {
      cancelled = true;
    };
  }, [user, open]);

  const resetForm = () => {
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await usersApi.update(user.id, {
      displayName: displayName.trim() || undefined,
      status,
      role_ids: [selectedRole],
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("User updated successfully");
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1000);
    }

    setLoading(false);
  };

  const handleResetMfa = async () => {
    if (!user) return;

    setResettingMfa(true);
    setError(null);
    setSuccess(null);

    const result = await usersApi.resetMfa(user.id);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("MFA reset successfully. User will need to re-enroll.");
    }

    setResettingMfa(false);
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit User
          </SheetTitle>
          <SheetDescription>
            Update user information and permissions for {user.email}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input value={user.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Disabled users cannot log in and their sessions are revoked
            </p>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <Label>Assigned Role</Label>
            {loadingRoles ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading roles...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableRoles.map((role) => (
                  <Badge
                    key={role.id}
                    variant={selectedRole === role.id ? "default" : "outline"}
                    className="cursor-pointer transition-colors px-3 py-1.5 text-sm"
                    onClick={() => setSelectedRole(role.id)}
                  >
                    {role.name}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Select one role for this user
            </p>
          </div>

          {/* MFA Section */}
          {canManageMfa && (
            <div className="space-y-2 pt-4 border-t">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Multi-Factor Authentication
              </Label>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">
                    MFA Status:{" "}
                    <Badge variant={user.mfaEnabled ? "default" : "secondary"}>
                      {user.mfaEnabled ? "Enabled" : "Not Configured"}
                    </Badge>
                  </p>
                  {user.mfaEnabled && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reset will require user to re-enroll
                    </p>
                  )}
                </div>
                {user.mfaEnabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleResetMfa}
                    disabled={resettingMfa}
                  >
                    {resettingMfa ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Reset MFA"
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
