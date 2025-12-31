"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { clientsApi } from "@/lib/api";

interface Client {
  id: string;
  clientId: string;
  name?: string | null;
}

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}

export function DeleteClientDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: DeleteClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!client) return;

    setLoading(true);
    setError(null);

    const result = await clientsApi.delete(client.id);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
      onOpenChange(false);
    }

    setLoading(false);
  };

  if (!client) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Delete Application</SheetTitle>
          <SheetDescription>This action cannot be undone.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">
                  Delete {client.name || client.clientId}?
                </p>
                <p className="text-sm text-red-700 mt-1">This will:</p>
                <ul className="text-sm text-red-700 list-disc ml-4 mt-1 space-y-1">
                  <li>Revoke all active tokens for this client</li>
                  <li>Block all future authorization requests</li>
                  <li>Remove the client from your organization</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Client ID</p>
            <code className="text-sm font-mono">{client.clientId}</code>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Application"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
