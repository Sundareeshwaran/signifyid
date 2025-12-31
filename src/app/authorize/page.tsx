"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Shield,
  Globe,
  Lock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { oauthApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

function AuthorizeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<{
    client_id: string;
    client_name: string;
    redirect_uri: string;
    scopes: string[];
    state: string;
    mfa_required: boolean;
  } | null>(null);

  const client_id = searchParams.get("client_id") || "";
  const redirect_uri = searchParams.get("redirect_uri") || "";
  const response_type = searchParams.get("response_type") || "code";
  const scope = searchParams.get("scope") || "openid";
  const state = searchParams.get("state") || "";
  const code_challenge = searchParams.get("code_challenge") || "";
  const code_challenge_method = searchParams.get("code_challenge_method") || "";
  const nonce = searchParams.get("nonce") || "";

  useEffect(() => {
    async function loadClientInfo() {
      // Wait for auth to load
      if (authLoading) return;

      // Check if user is authenticated
      if (!user) {
        // Redirect to login with return URL
        const returnUrl = `/authorize?${searchParams.toString()}`;
        router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await oauthApi.getAuthorizeInfo({
          client_id,
          redirect_uri,
          response_type,
          scope,
          state,
          code_challenge,
          code_challenge_method,
          nonce,
        });

        if (result.error) {
          // Redirect to error page
          const errorParams = new URLSearchParams({
            error: result.error,
            error_description: result.error || "Client validation failed",
            state,
          });
          router.push(`/oauth/error?${errorParams.toString()}`);
          return;
        }

        if (result.data) {
          setClientInfo(result.data);
        }
      } catch (err) {
        setError("Failed to load client information. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadClientInfo();
  }, [
    authLoading,
    user,
    client_id,
    redirect_uri,
    response_type,
    scope,
    state,
    code_challenge,
    code_challenge_method,
    nonce,
    router,
    searchParams,
  ]);

  const handleApprove = () => {
    // Redirect to verification page with all parameters
    const verifyParams = new URLSearchParams({
      client_id,
      redirect_uri,
      scope,
      state,
      ...(code_challenge && { code_challenge }),
      ...(code_challenge_method && { code_challenge_method }),
      ...(nonce && { nonce }),
    });
    router.push(`/verify?${verifyParams.toString()}`);
  };

  const handleDeny = () => {
    // Redirect back to client with error
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("error", "access_denied");
    if (state) redirectUrl.searchParams.set("state", state);
    window.location.href = redirectUrl.toString();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading authorization request...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !clientInfo) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error || "Failed to load authorization request"}
            </p>
            <Button onClick={() => router.push("/dashboard")} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Parse scopes into readable format
  const scopeLabels: Record<string, { label: string; description: string }> = {
    openid: {
      label: "OpenID",
      description: "Access your identity",
    },
    profile: {
      label: "Profile",
      description: "Access your profile information",
    },
    email: {
      label: "Email",
      description: "Access your email address",
    },
    offline_access: {
      label: "Offline Access",
      description: "Access your data when you're offline",
    },
  };

  // Check if redirect URI uses HTTPS
  const isHttps = redirect_uri.startsWith("https://");
  const isLocalhost =
    redirect_uri.includes("localhost") || redirect_uri.includes("127.0.0.1");

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Authorize Application</CardTitle>
              <CardDescription>
                {clientInfo.client_name} wants to access your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Information */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h3 className="text-sm font-medium mb-3">Application Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Application:</span>
                <span className="font-medium">{clientInfo.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client ID:</span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs">
                  {clientInfo.client_id}
                </code>
              </div>
            </div>
          </div>

          {/* Requested Scopes */}
          <div>
            <h3 className="text-sm font-medium mb-3">
              This app will be able to:
            </h3>
            <div className="space-y-2">
              {clientInfo.scopes.map((scope) => {
                const scopeInfo = scopeLabels[scope] || {
                  label: scope,
                  description: `Access ${scope} data`,
                };
                return (
                  <div
                    key={scope}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border"
                  >
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{scopeInfo.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {scopeInfo.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Security Information</h3>
            <div className="space-y-2">
              {/* Redirect URI */}
              <div className="flex items-start gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground">Redirect URI:</p>
                  <p className="font-mono text-xs break-all">
                    {clientInfo.redirect_uri}
                  </p>
                </div>
                {isHttps || isLocalhost ? (
                  <Badge
                    variant="outline"
                    className="text-green-500 flex-shrink-0"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Secure
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex-shrink-0">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Insecure
                  </Badge>
                )}
              </div>

              {/* MFA Status */}
              {clientInfo.mfa_required && (
                <div className="flex items-start gap-2 text-sm">
                  <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">
                      Multi-factor authentication will be required to complete
                      authorization.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Warning for non-HTTPS */}
          {!isHttps && !isLocalhost && (
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Insecure Connection Warning
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    This application is not using a secure HTTPS connection.
                    Your data may be at risk. Proceed with caution.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDeny} className="flex-1">
              Deny
            </Button>
            <Button onClick={handleApprove} className="flex-1">
              Authorize
            </Button>
          </div>

          {/* User Info */}
          <div className="text-center text-xs text-muted-foreground">
            You are authorizing as <strong>{user?.email}</strong>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/30 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AuthorizeContent />
    </Suspense>
  );
}
