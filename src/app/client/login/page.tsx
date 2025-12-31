"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertCircle, Loader2 } from "lucide-react";
import { getRedirectParam } from "@/lib/safeRedirect";

// Response data from the login API
interface LoginResponseData {
  success?: boolean;
  session_id?: string;
  session_token?: string;
  expires_at?: string;
  redirect_uri?: string;
  error?: string;
  error_description?: string;
}

function ClientLoginContent() {
  const router = useRouter();
  const [lastResponse, setLastResponse] = useState<LoginResponseData | null>(
    null
  );
  const searchParams = useSearchParams();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error") || "");

  // Get redirect URL from params (supports both 'redirect' and 'redirect_uri')
  // NOTE: We pass this to the backend for validation against registered redirect URIs
  const rawRedirectUrl = useMemo(() => {
    return getRedirectParam(searchParams, "redirect") || null;
  }, [searchParams]);

  const errorParam = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      // Send the redirect_uri from query params to backend
      // Backend will validate against registered URIs and return final redirect
      const response = await fetch(`${apiUrl}/api/client-auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: rawRedirectUrl || undefined,
        }),
      });

      const data = await response.json();
      setLastResponse(data);

      if (!response.ok) {
        throw new Error(data.error_description || "Login failed");
      }

      // Success - determine final redirect destination
      console.log("Login successful, response:", data);

      // Use the backend-returned redirect_uri (already validated against registered URIs)
      const finalDestination = data.redirect_uri;

      if (finalDestination) {
        // Build redirect URL with token if needed
        let finalUrl: string;

        try {
          const targetUrl = new URL(finalDestination);
          if (data.session_token) {
            targetUrl.searchParams.set("token", data.session_token);
          }
          finalUrl = targetUrl.toString();
        } catch {
          // Handle relative paths
          if (finalDestination.startsWith("/")) {
            finalUrl = finalDestination;
          } else {
            // Fallback: manually append token
            const separator = finalDestination.includes("?") ? "&" : "?";
            finalUrl = data.session_token
              ? `${finalDestination}${separator}token=${data.session_token}`
              : finalDestination;
          }
        }

        console.log("Redirecting to:", finalUrl);

        // Use window.location.href for cross-origin redirects
        window.location.href = finalUrl;
        return;
      } else {
        // Default - show success page
        console.log("Redirecting to success page");
        router.push("/client/success");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      const message =
        err instanceof Error ? err.message : "An error occurred during login";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center  px-4">
      {/* Background blobs */}
      <div
        className="absolute inset-0 bg-no-repeat bg-cover bg-center dark:hidden"
        style={{ backgroundImage: "url('/welcome_blob_light.svg')" }}
      />
      <div
        className="absolute inset-0 bg-no-repeat bg-cover bg-center hidden dark:block"
        style={{ backgroundImage: "url('/welcome_blob_dark.svg')" }}
      />
      <Card className="w-full max-w-md shadow-xl z-10">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Client Authentication</CardTitle>
          <CardDescription>
            Enter your client credentials to access the protected site
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorParam && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorParam === "no_session" &&
                  "No active session found. Please login."}
                {errorParam === "invalid_session" &&
                  "Your session is invalid or expired."}
                {errorParam === "session_expired" &&
                  "Your session has expired. Please login again."}
                {errorParam === "session_revoked" &&
                  "Your session has been revoked. Please login again."}
                {errorParam === "fingerprint_mismatch" &&
                  "Security check failed. Please login again."}
                {errorParam === "validation_failed" &&
                  "Session validation failed. Please try again."}
                {errorParam === "callback_error" &&
                  "Authentication callback failed. Please login."}
                {errorParam === "client_not_found" && "Client not found."}
                {errorParam === "server_error" &&
                  "Server error occurred. Please try again."}
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                type="text"
                placeholder="client_abc123..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                disabled={loading}
                autoComplete="off"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="secret_xyz456..."
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required
                disabled={loading}
                autoComplete="off"
                className="font-mono text-sm"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Authenticating..." : "Login"}
            </Button>
          </form>
          <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>This is a secure client authentication system.</p>
            <p className="mt-1">
              Contact your administrator if you need credentials.
            </p>
          </div>
          {/*DEBUG SECTION
          <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto max-h-40 font-mono">
            <p className="font-bold">Debug Info:</p>
            <pre>
              {JSON.stringify(
                {
                  redirect_param: rawRedirectUrl,
                  loading,
                  error,
                  last_response: lastResponse,
                },
                null,
                2
              )}
            </pre>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}

// Loading fallback for Suspense
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <CardTitle className="text-2xl">Loading...</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function ClientLoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <ClientLoginContent />
    </Suspense>
  );
}
