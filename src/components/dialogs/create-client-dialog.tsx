"use client";

import { useState } from "react";
import { Loader2, Copy, Check, AlertTriangle, Plus, X } from "lucide-react";
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
import { clientsApi } from "@/lib/api";

// Available scopes
const AVAILABLE_SCOPES = ["openid", "profile", "email", "offline_access"];

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CreatedClient {
  id: string;
  clientId: string;
  clientSecret: string;
  name: string | null;
  redirectUris: string[];
  scopes: string[];
  projectType: "website" | "api" | "internal";
}

export function CreateClientDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateClientDialogProps) {
  const [name, setName] = useState("");
  const [redirectUris, setRedirectUris] = useState<string[]>([""]);
  const [scopes, setScopes] = useState<string[]>(["openid"]);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([""]);
  const [projectType, setProjectType] = useState<
    "website" | "api" | "internal"
  >("website");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClient, setCreatedClient] = useState<CreatedClient | null>(
    null
  );
  const [copied, setCopied] = useState<{ id: boolean; secret: boolean }>({
    id: false,
    secret: false,
  });
  const [confirmed, setConfirmed] = useState(false);

  const resetForm = () => {
    setName("");
    setRedirectUris([""]);
    setScopes(["openid"]);
    setAllowedDomains([""]);
    setProjectType("website");
    setError(null);
    setCreatedClient(null);
    setCopied({ id: false, secret: false });
    setConfirmed(false);
  };

  const handleClose = () => {
    if (createdClient && !confirmed) {
      // Don't close if secret not confirmed
      return;
    }
    resetForm();
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
    if (scope === "openid") return; // openid is required
    if (scopes.includes(scope)) {
      setScopes(scopes.filter((s) => s !== scope));
    } else {
      setScopes([...scopes, scope]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Filter empty URIs
    const validUris = redirectUris.filter((uri) => uri.trim() !== "");

    if (validUris.length === 0) {
      setError("At least one redirect URI is required");
      setLoading(false);
      return;
    }

    // Filter empty domains
    const validDomains = allowedDomains.filter((d) => d.trim() !== "");

    const result = await clientsApi.create({
      name: name.trim() || undefined,
      redirectUris: validUris,
      scopes,
      allowedDomains: validDomains.length > 0 ? validDomains : undefined,
      projectType,
    });

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setCreatedClient(result.data as CreatedClient);
    }

    setLoading(false);
  };

  const copyToClipboard = async (text: string, field: "id" | "secret") => {
    await navigator.clipboard.writeText(text);
    setCopied({ ...copied, [field]: true });
    setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
  };

  const handleConfirmAndClose = () => {
    setConfirmed(true);
    resetForm();
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {createdClient
              ? "Client Created Successfully"
              : "Register New Application"}
          </SheetTitle>
          <SheetDescription>
            {createdClient
              ? "Save your client credentials securely. The secret cannot be retrieved later."
              : "Create a new OAuth2/OIDC client application."}
          </SheetDescription>
        </SheetHeader>

        {!createdClient ? (
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Application Name</Label>
              <Input
                id="name"
                placeholder="My Application"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to identify this application
              </p>
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
              <p className="text-xs text-muted-foreground">
                Authorized callback URLs for OAuth2 redirects
              </p>
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
              <p className="text-xs text-muted-foreground">
                Permissions this client can request
              </p>
            </div>

            {/* Project Type */}
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select
                value={projectType}
                onValueChange={(v: "website" | "api" | "internal") =>
                  setProjectType(v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="api">API Application</SelectItem>
                  <SelectItem value="internal">Internal Tool</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The type of application this client represents
              </p>
            </div>

            {/* Allowed Domains */}
            <div className="space-y-2">
              <Label>Allowed Domains (Optional)</Label>
              {allowedDomains.map((domain, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="https://example.com"
                    value={domain}
                    onChange={(e) => {
                      const updated = [...allowedDomains];
                      updated[index] = e.target.value;
                      setAllowedDomains(updated);
                    }}
                  />
                  {allowedDomains.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setAllowedDomains(
                          allowedDomains.filter((_, i) => i !== index)
                        )
                      }
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
                onClick={() => setAllowedDomains([...allowedDomains, ""])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
              <p className="text-xs text-muted-foreground">
                Domains authorized for client site authentication
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
                    Creating...
                  </>
                ) : (
                  "Create Application"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Warning */}
            <div className="p-4 bg-accent/50 border border-accent rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-accent-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    Save these credentials now
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The client secret will not be shown again. Store it
                    securely.
                  </p>
                </div>
              </div>
            </div>

            {/* Client ID */}
            <div className="space-y-2">
              <Label>Client ID</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={createdClient.clientId}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(createdClient.clientId, "id")}
                >
                  {copied.id ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Client Secret */}
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={createdClient.clientSecret}
                  className="font-mono text-sm"
                  type="text"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(createdClient.clientSecret, "secret")
                  }
                >
                  {copied.secret ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirm and Close */}
            <Button onClick={handleConfirmAndClose} className="w-full">
              I&apos;ve saved the credentials
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
