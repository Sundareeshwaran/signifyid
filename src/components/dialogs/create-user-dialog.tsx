"use client";

import { useState, useEffect } from "react";
import { Loader2, UserPlus, X, AlertTriangle, Eye, EyeOff } from "lucide-react";
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

interface CreateUserDialogProps {
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

// Password validation
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const MIN_PASSWORD_LENGTH = 8;

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= MIN_PASSWORD_LENGTH) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 4) return { score, label: "Medium", color: "bg-yellow-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  // Password validation
  const isPasswordValid =
    password.length >= MIN_PASSWORD_LENGTH && PASSWORD_REGEX.test(password);
  const doPasswordsMatch = password === confirmPassword;

  // Fetch available roles when dialog opens
  useEffect(() => {
    if (open) {
      const fetchRoles = async () => {
        setLoadingRoles(true);
        const result = await rolesApi.list();
        if (result.data) {
          setAvailableRoles(result.data.roles);
          // Set default role to 'user' role ID
          const userRole = result.data.roles.find(
            (r: Role) => r.name === "user"
          );
          if (userRole) {
            setSelectedRole(userRole.id);
          }
        }
        setLoadingRoles(false);
      };
      void fetchRoles();
    }
  }, [open]);

  const resetForm = () => {
    setEmail("");
    setDisplayName("");
    setPassword("");
    setConfirmPassword("");
    setSelectedRole("");
    setError(null);
    setShowPassword(false);
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

    // Validation
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

    if (!isPasswordValid) {
      setError(
        "Password must be at least 8 characters with uppercase, lowercase, and number"
      );
      setLoading(false);
      return;
    }

    if (!doPasswordsMatch) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const result = await usersApi.create({
      email: email.trim(),
      password,
      displayName: displayName.trim(),
      role_ids: [selectedRole],
    });

    if (result.error) {
      setError(result.error);
    } else {
      resetForm();
      onOpenChange(false);
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </SheetTitle>
          <SheetDescription>
            Create a user with immediate access. This user will be active right
            away.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Warning */}
          <div className="p-4 bg-accent/50 border border-accent rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-accent-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <strong className="text-foreground">Super Admin Action:</strong>{" "}
              This will create an active user who can log in immediately. Use
              &quot;Invite User&quot; for a more secure onboarding flow.
            </div>
          </div>

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
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {password && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all`}
                      style={{
                        width: `${(passwordStrength.score / 6) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {passwordStrength.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters with uppercase, lowercase, and
                  number
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && !doPasswordsMatch && (
              <p className="text-xs text-red-600">Passwords do not match</p>
            )}
          </div>

          {/* Role Selection */}
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
              Select one role for this user (Default: user)
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
            <Button
              type="submit"
              disabled={loading || !isPasswordValid || !doPasswordsMatch}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
