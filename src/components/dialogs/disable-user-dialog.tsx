"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, UserX, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usersApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface UserData {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  roles: string[];
}

interface DisableUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSuccess: () => void;
}

export function DisableUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: DisableUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisable = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const result = await usersApi.disable(user.id);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onSuccess();
      onOpenChange(false);
      setLoading(false);
    }
  };

  if (!user) return null;

  const displayName = user.displayName || user.email.split("@")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-orange-600" />
            Disable User Account
          </DialogTitle>
          <DialogDescription>
            This action will immediately block user access and revoke all active
            sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Warning Box */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-orange-900">
                  Disable {displayName}?
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  This will immediately:
                </p>
                <ul className="text-sm text-orange-700 list-disc ml-4 mt-1 space-y-1">
                  <li>Block all login attempts</li>
                  <li>Revoke all active sessions</li>
                  <li>Invalidate all access tokens</li>
                  <li>Prevent API access</li>
                </ul>
                <p className="text-sm text-orange-700 mt-2">
                  You can re-enable this account later if needed.
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Status</p>
              <Badge variant="default">
                <XCircle className="h-3 w-3 mr-1" />
                {user.status}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Disabling...
              </>
            ) : (
              <>
                <UserX className="h-4 w-4 mr-2" />
                Disable User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
