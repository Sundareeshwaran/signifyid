"use client";

/**
 * Client Callback Page
 *
 * Handles post-login redirects for client authentication.
 * Validates the session and redirects to the original destination.
 */
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSafeRedirectUrl } from "@/lib/safeRedirect";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

function ClientCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"validating" | "success" | "error">(
    "validating",
  );
  const [message, setMessage] = useState("Verifying your session...");

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get redirect target from URL params
        const redirectUri =
          searchParams.get("redirect_uri") || searchParams.get("redirect");
        const token = searchParams.get("token");

        // Validate session with backend
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

        const response = await fetch(`${apiUrl}/client-auth/session/validate`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.valid) {
          setStatus("success");
          setMessage("Session verified! Redirecting you now...");

          // Get safe redirect URL (prevent open redirects)
          const safeRedirect = getSafeRedirectUrl(
            redirectUri,
            "/client/success",
            [], // Allow same-origin only
          );

          // Small delay for user feedback
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Redirect to the original destination
          router.push(safeRedirect);
        } else {
          setStatus("error");
          setMessage(
            data.error_description ||
              "Session validation failed. Please login again.",
          );

          // Redirect to login after showing error
          setTimeout(() => {
            const loginUrl = new URL("/client/login", window.location.origin);
            if (redirectUri) {
              loginUrl.searchParams.set("redirect", redirectUri);
            }
            loginUrl.searchParams.set("error", data.error || "session_invalid");
            router.push(loginUrl.toString());
          }, 2000);
        }
      } catch (error) {
        console.error("[ClientCallback] Error:", error);
        setStatus("error");
        setMessage("An error occurred. Redirecting to login...");

        // Redirect to login on error
        setTimeout(() => {
          router.push("/client/login?error=callback_error");
        }, 2000);
      }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4">
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
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2">
            {status === "validating" && (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            )}
            {status === "success" && (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            )}
            {status === "error" && (
              <AlertCircle className="w-8 h-8 text-destructive" />
            )}
          </div>
          <CardTitle className="text-xl">
            {status === "validating" && "Verifying Session"}
            {status === "success" && "Session Verified"}
            {status === "error" && "Session Error"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "validating" && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Please wait while we verify your credentials...</p>
            </div>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You will be redirected to the login page shortly.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Loading fallback for Suspense
function CallbackLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <CardTitle className="text-xl">Loading...</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function ClientCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <ClientCallbackContent />
    </Suspense>
  );
}
