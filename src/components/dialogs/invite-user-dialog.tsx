"use client";

import { useState, useEffect } from "react";
import { Loader2, UserPlus, X, Copy, Check, Mail } from "lucide-react";
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
import { usersApi, rolesApi } from "@/lib/api";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
}

interface InviteResult {
  email: string;
  inviteUrl: string;
  expiresAt: string;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch available roles
  useEffect(() => {
    if (open) {
      fetchRoles();
    }
  }, [open]);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    const result = await rolesApi.list();
    if (result.data) {
      setAvailableRoles(result.data.roles);
      // Set default role to 'user' role ID
      const userRole = result.data.roles.find((r: Role) => r.name === "user");
      if (userRole && !selectedRole) {
        setSelectedRole(userRole.id);
      }
    }
    setLoadingRoles(false);
  };

  const resetForm = () => {
    setEmail("");
    setDisplayName("");
    setSelectedRole("");
    setError(null);
    setInviteResult(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    if (!displayName.trim()) {
      setError("Display name is required");
      setLoading(false);
      return;
    }

    const result = await usersApi.invite({
      email: email.trim(),
      displayName: displayName.trim(),
      role_ids: [selectedRole],
    });

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      // Show success with invite link
      const baseUrl = window.location.origin;
      setInviteResult({
        email: email.trim(),
        inviteUrl: `${baseUrl}${result.data.inviteUrl}`,
        expiresAt: result.data.expiresAt,
      });
      onSuccess();
    }

    setLoading(false);
  };

  const copyInviteLink = async () => {
    if (inviteResult) {
      await navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDone = () => {
    resetForm();
    onOpenChange(false);
  };

  // Success view
  if (inviteResult) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Invitation Sent
            </SheetTitle>
            <SheetDescription>
              The user has been invited to join your organization.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Success message */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">
                    Invitation created for {inviteResult.email}
                  </p>
                  <p className="mt-1 text-green-700">
                    The user will need to click the invite link to set their
                    password and activate their account.
                  </p>
                </div>
              </div>
            </div>

            {/* Invite link */}
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteResult.inviteUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyInviteLink}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link expires on{" "}
                {new Date(inviteResult.expiresAt).toLocaleDateString()}
              </p>
            </div>

            {/* Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You can share this link with the user
                directly, or they will receive it via email (if email is
                configured).
              </p>
            </div>

            {/* Done button */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setInviteResult(null);
                  setEmail("");
                  setDisplayName("");
                  setSelectedRole("");
                }}
                className="flex-1"
              >
                Invite Another
              </Button>
              <Button type="button" onClick={handleDone} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </SheetTitle>
          <SheetDescription>
            Invite a user to join your organization. They will receive an email
            to set up their password.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              How this user will appear in the system
            </p>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <Label>Assign Role</Label>
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
                    onClick={() => handleRoleSelect(role.id)}
                  >
                    {role.name}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Select one role to assign to this user
            </p>
          </div>

          {/* Info box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The user will be created with "Invited"
              status. They will need to set their password before they can log
              in.
            </p>
          </div>

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
                  Inviting...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
