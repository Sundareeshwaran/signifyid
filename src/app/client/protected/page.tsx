"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Demo Protected Page Content
 *
 * This page demonstrates the client authentication flow.
 * It will redirect unauthenticated users to the login page.
 *
 * Test flow:
 * 1. Access this page directly: /client/protected
 * 2. You should be redirected to /client/login?redirect=...
 * 3. Enter client credentials
 * 4. After login, you should be redirected back here
 */
function ClientProtectedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionInfo, setSessionInfo] = useState<{
    valid: boolean;
    session_id?: string;
    client_id?: string;
    expires_at?: string;
    domain?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get token from URL if redirected from login
  const tokenFromUrl = searchParams.get("token");

  useEffect(() => {
    async function validateSession() {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

        const response = await fetch(
          `${apiUrl}/api/client-auth/session/validate`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (data.valid) {
          setSessionInfo(data);
          setError(null);
        } else {
          setError(data.error || "Session invalid");
          setSessionInfo({ valid: false });
        }
      } catch (err) {
        console.error("Session validation error:", err);
        setError("Failed to validate session");
        setSessionInfo({ valid: false });
      } finally {
        setLoading(false);
      }
    }

    validateSession();
  }, []);

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      await fetch(`${apiUrl}/api/client-auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      router.push("/client/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Validating session...
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <Card className="w-full max-w-lg shadow-xl z-10">
        <CardHeader className="space-y-2 text-center">
          <div
            className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
              sessionInfo?.valid
                ? "bg-green-100 dark:bg-green-900/20"
                : "bg-red-100 dark:bg-red-900/20"
            }`}
          >
            {sessionInfo?.valid ? (
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            ) : (
              <Lock className="w-10 h-10 text-red-600 dark:text-red-400" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {sessionInfo?.valid ? "Protected Content" : "Access Denied"}
          </CardTitle>
          <CardDescription>
            {sessionInfo?.valid
              ? "You have successfully accessed this protected page"
              : "This page requires client authentication"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sessionInfo?.valid ? (
            <>
              {/* Success State */}
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Your session is valid and authenticated!
                </AlertDescription>
              </Alert>

              {/* Session Details */}
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Session Details</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session ID:</span>
                    <code className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                      {sessionInfo.session_id?.slice(0, 8)}...
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client ID:</span>
                    <code className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                      {sessionInfo.client_id?.slice(0, 15)}...
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires:</span>
                    <span className="text-xs">
                      {sessionInfo.expires_at
                        ? new Date(sessionInfo.expires_at).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {tokenFromUrl && (
                <div className="text-xs text-muted-foreground text-center">
                  ✅ Redirected from login with token
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              {/* Not Authenticated State */}
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error || "You need to authenticate to access this page."}
                </AlertDescription>
              </Alert>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Click the button below to login with your client credentials.
                </p>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  const currentUrl = window.location.href;
                  router.push(
                    `/client/login?redirect=${encodeURIComponent(currentUrl)}`
                  );
                }}
              >
                <Lock className="w-4 h-4 mr-2" />
                Login with Client Credentials
              </Button>
            </>
          )}

          <div className="pt-4 border-t text-center text-xs text-muted-foreground">
            <p>
              This is a demo protected page for testing the client auth flow.
            </p>
            <p className="mt-1">
              The middleware should redirect unauthenticated users to login.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading fallback for Suspense
function ProtectedLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientProtectedPage() {
  return (
    <Suspense fallback={<ProtectedLoading />}>
      <ClientProtectedContent />
    </Suspense>
  );
}
