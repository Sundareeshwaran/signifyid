"use client";

import { useState, useEffect } from "react";
import { Loader2, Copy, Check, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clientsApi } from "@/lib/api";

interface Client {
  id: string;
  clientId: string;
  name?: string | null;
}

interface RegenerateSecretDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess?: () => void;
}

export function RegenerateSecretDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: RegenerateSecretDialogProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setNewSecret(null);
      setError(null);
      setCopied(false);
      setConfirmed(false);
    }
  }, [open]);

  const handleClose = () => {
    setNewSecret(null);
    setError(null);
    setCopied(false);
    setConfirmed(false);
    onOpenChange(false);
  };

  const handleRegenerateSecret = async () => {
    if (!client) return;

    setRegenerating(true);
    setError(null);

    const result = await clientsApi.regenerateSecret(client.id);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setNewSecret(result.data.clientSecret);
      setConfirmed(true);
      onSuccess?.();
    }

    setRegenerating(false);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate Client Secret</DialogTitle>
          <DialogDescription>
            {client.name || client.clientId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* New Secret Display */}
          {newSecret ? (
            <div className="p-4 bg-accent/50 border border-accent rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-accent-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    New Client Secret Generated
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Save this now - it won't be shown again. Make sure to update
                    all applications using this client.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={newSecret}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(newSecret)}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-red-900">
                    This will invalidate the current secret
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    All applications using the current client secret will stop
                    working immediately. You'll need to update them with the new
                    secret.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {newSecret ? (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={regenerating}
                onClick={handleRegenerateSecret}
                className="flex-1"
              >
                {regenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Confirm Regenerate
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
