"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Plus,
  X,
  RefreshCw,
} from "lucide-react";
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
import { clientsApi } from "@/lib/api";

// Available scopes
const AVAILABLE_SCOPES = ["openid", "profile", "email", "offline_access"];

interface Client {
  id: string;
  clientId: string;
  name?: string | null;
  redirectUris: string[];
  scopes: string[];
}

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}

export function EditClientDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: EditClientDialogProps) {
  const [name, setName] = useState("");
  const [redirectUris, setRedirectUris] = useState<string[]>([""]);
  const [scopes, setScopes] = useState<string[]>(["openid"]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Sync state with client prop when it changes
  useEffect(() => {
    if (client) {
      setName(client.name || "");
      setRedirectUris(
        client.redirectUris.length > 0 ? client.redirectUris : [""]
      );
      setScopes(client.scopes.length > 0 ? client.scopes : ["openid"]);
      setNewSecret(null);
      setError(null);
      setShowRegenerateConfirm(false);
    }
  }, [client?.id]);

  const handleClose = () => {
    setNewSecret(null);
    setError(null);
    setShowRegenerateConfirm(false);
    onOpenChange(false);
  };

  const addRedirectUri = () => {
    setRedirectUris([...redirectUris, ""]);
  };

  const removeRedirectUri = (index: number) => {
    if (redirectUris.length > 1) {
      setRedirectUris(redirectUris.filter((_, i) => i !== index));
    }
  };

  const updateRedirectUri = (index: number, value: string) => {
    const updated = [...redirectUris];
    updated[index] = value;
    setRedirectUris(updated);
  };

  const toggleScope = (scope: string) => {
    if (scope === "openid") return;
    if (scopes.includes(scope)) {
      setScopes(scopes.filter((s) => s !== scope));
    } else {
      setScopes([...scopes, scope]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setLoading(true);
    setError(null);

    const validUris = redirectUris.filter((uri) => uri.trim() !== "");

    if (validUris.length === 0) {
      setError("At least one redirect URI is required");
      setLoading(false);
      return;
    }

    const result = await clientsApi.update(client.id, {
      name: name.trim() || undefined,
      redirectUris: validUris,
      scopes,
    });

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
      handleClose();
    }

    setLoading(false);
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
      setShowRegenerateConfirm(false);
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
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Application</SheetTitle>
          <SheetDescription>
            Update OAuth2/OIDC client configuration
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* New Secret Display */}
          {newSecret && (
            <div className="p-4 bg-accent/50 border border-accent rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-accent-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    New Client Secret
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Save this now - it won&apos;t be shown again
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
          )}

          {/* Client ID (read-only) */}
          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input
              readOnly
              value={client.clientId}
              className="font-mono text-sm bg-muted cursor-not-allowed"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Application Name</Label>
            <Input
              id="name"
              placeholder="My Application"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Redirect URIs */}
          <div className="space-y-2">
            <Label>Redirect URIs</Label>
            {redirectUris.map((uri, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="https://example.com/callback"
                  value={uri}
                  onChange={(e) => updateRedirectUri(index, e.target.value)}
                />
                {redirectUris.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRedirectUri(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRedirectUri}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add URI
            </Button>
          </div>

          {/* Scopes */}
          <div className="space-y-2">
            <Label>Scopes</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <Badge
                  key={scope}
                  variant={scopes.includes(scope) ? "default" : "outline"}
                  className={`cursor-pointer ${
                    scope === "openid" ? "opacity-75" : ""
                  }`}
                  onClick={() => toggleScope(scope)}
                >
                  {scope}
                  {scope === "openid" && " (required)"}
                </Badge>
              ))}
            </div>
          </div>

          {/* Regenerate Secret */}
          <div className="space-y-2">
            <Label>Client Secret</Label>
            {showRegenerateConfirm ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                <p className="text-sm text-red-700">
                  This will invalidate the current secret. All applications
                  using it will break.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={regenerating}
                    onClick={handleRegenerateSecret}
                  >
                    {regenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Confirm Regenerate"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRegenerateConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRegenerateConfirm(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Secret
              </Button>
            )}
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
