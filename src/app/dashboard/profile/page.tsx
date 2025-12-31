"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Shield,
  Clock,
  Monitor,
  Key,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usersApi } from "@/lib/api";
import { ROLE_DISPLAY_NAMES, type Role } from "@/lib/rbac";
import { PasskeySettings } from "@/components/settings/PasskeySettings";

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  mfaEnabled?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

/**
 * Profile Page
 *
 * Shows user's personal information, security status, and sessions.
 * Available to all authenticated users.
 */
export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    const result = await usersApi.getProfile();

    if (result.data) {
      setProfile(result.data as UserProfile);
    }

    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      await loadProfile();
    })();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          Failed to load profile
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account and security settings
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadProfile}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Profile Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile.displayName}</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{profile.email}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Roles
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.roles.length > 0 ? (
                [...new Set(profile.roles)].map((role, index) => (
                  <Badge key={`${role}-${index}`} variant="secondary">
                    {ROLE_DISPLAY_NAMES[role as Role] || role}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline">User</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Status */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5" />
              MFA Status
            </CardTitle>
            <CardDescription>
              Multi-factor authentication protects your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {profile.mfaEnabled ? (
                <>
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-600">Enabled</p>
                    <p className="text-sm text-muted-foreground">
                      Your account is protected
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-600">Not Enabled</p>
                    <p className="text-sm text-muted-foreground">
                      Consider enabling MFA for better security
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5" />
              Last Login
            </CardTitle>
            <CardDescription>Your most recent sign-in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {formatDate(profile.lastLoginAt) || "Just now"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Current session active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Passkey Settings */}
      <div className="mb-6">
        <PasskeySettings />
      </div>

      {/* Permissions Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-5 w-5" />
            Permissions
          </CardTitle>
          <CardDescription>
            What you can access in this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile.permissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.permissions.slice(0, 20).map((perm) => (
                <Badge key={perm} variant="outline" className="text-xs">
                  {perm}
                </Badge>
              ))}
              {profile.permissions.length > 20 && (
                <Badge variant="secondary" className="text-xs">
                  +{profile.permissions.length - 20} more
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Basic access permissions
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
