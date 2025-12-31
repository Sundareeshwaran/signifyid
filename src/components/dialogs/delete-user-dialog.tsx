"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersApi } from "@/lib/api";

interface UserData {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  roles: string[];
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSuccess: () => void;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: DeleteUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");

  const handleDelete = async () => {
    if (!user) return;

    // Final check for exact email match
    if (confirmEmail !== user.email) {
      setError("Email does not match. Deletion cancelled.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await usersApi.delete(user.id);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onSuccess();
      onOpenChange(false);
      setLoading(false);
      // Reset confirmation input
      setConfirmEmail("");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setConfirmEmail("");
      setError(null);
    }
    onOpenChange(open);
  };

  if (!user) return null;

  const displayName = user.displayName || user.email.split("@")[0];
  const isConfirmationValid = confirmEmail === user.email;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-5 w-5" />
            Permanent User Deletion
          </DialogTitle>
          <DialogDescription className="text-red-600">
            This action CANNOT be undone. All user data will be permanently
            deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Danger Warning */}
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-red-900 text-lg">
                  ⚠️ WARNING: PERMANENT DELETION
                </p>
                <p className="text-sm text-red-800 mt-2">
                  You are about to <strong>permanently delete</strong>{" "}
                  {displayName}.
                </p>
                <p className="text-sm text-red-800 mt-2 font-medium">
                  This will IMMEDIATELY and PERMANENTLY:
                </p>
                <ul className="text-sm text-red-800 list-disc ml-4 mt-1 space-y-1">
                  <li>Delete ALL user data from the database</li>
                  <li>Remove all role assignments</li>
                  <li>Delete all MFA methods and recovery codes</li>
                  <li>Revoke all active sessions and tokens</li>
                  <li>Remove all associated devices</li>
                  <li>Delete invite tokens</li>
                </ul>
                <p className="text-sm text-red-800 mt-3 font-bold">
                  ❌ THIS ACTION CANNOT BE REVERSED
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                User Email
              </p>
              <code className="text-sm font-mono font-semibold">
                {user.email}
              </code>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Display Name
              </p>
              <p className="text-sm">{user.displayName || "Not set"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Roles</p>
              <p className="text-sm">{user.roles.join(", ") || "None"}</p>
            </div>
          </div>

          {/* Typed Confirmation */}
          <div className="space-y-2 pt-2 border-t-2 border-red-200">
            <Label htmlFor="confirmEmail" className="text-sm font-semibold">
              To confirm deletion, type the user&apos;s email address:
            </Label>
            <Input
              id="confirmEmail"
              type="text"
              placeholder="Type email address here..."
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="font-mono border-2 focus:border-red-500"
              disabled={loading}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Expected:{" "}
              <code className="font-mono font-semibold">{user.email}</code>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !isConfirmationValid}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User (Permanent)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
