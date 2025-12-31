"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { oauthApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);

  const client_id = searchParams.get("client_id") || "";
  const redirect_uri = searchParams.get("redirect_uri") || "";
  const scope = searchParams.get("scope") || "openid";
  const state = searchParams.get("state") || "";
  const code_challenge = searchParams.get("code_challenge") || "";
  const code_challenge_method = searchParams.get("code_challenge_method") || "";
  const nonce = searchParams.get("nonce") || "";
  const client_secret = searchParams.get("client_secret") || "";

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to login
      router.push("/login");
      return;
    }

    // Check if user has MFA enabled by making a request
    async function checkMfa() {
      try {
        const result = await oauthApi.getAuthorizeInfo({
          client_id,
          redirect_uri,
          response_type: "code",
          scope,
          state,
          code_challenge,
          code_challenge_method,
          nonce,
        });

        if (result.data?.mfa_required) {
          setMfaRequired(true);
        }
      } catch (err) {
        console.error("Failed to check MFA status:", err);
      }
    }

    checkMfa();
  }, [
    authLoading,
    user,
    router,
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method,
    nonce,
  ]);

  const handleVerify = async () => {
    if (mfaRequired && (!otpCode || otpCode.length !== 6)) {
      setError("Please enter a valid 6-digit OTP code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await oauthApi.verifyAndAuthorize({
        client_id,
        client_secret: client_secret || undefined,
        redirect_uri,
        scope,
        state,
        code_challenge: code_challenge || undefined,
        code_challenge_method: code_challenge_method || undefined,
        nonce: nonce || undefined,
        otp_code: mfaRequired ? otpCode : undefined,
      });

      if (result.error) {
        // Redirect to error page
        const errorParams = new URLSearchParams({
          error: result.error,
          error_description: result.error || "Verification failed",
          state,
        });
        router.push(`/oauth/error?${errorParams.toString()}`);
        return;
      }

      if (result.data?.redirect_uri) {
        // Success! Redirect to the client with authorization code
        window.location.href = result.data.redirect_uri;
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    // If MFA is not required, proceed without OTP
    if (!mfaRequired) {
      await handleVerify();
    }
  };

  useEffect(() => {
    // Auto-submit if MFA is not required
    if (!authLoading && user && !mfaRequired) {
      handleSkip();
    }
  }, [authLoading, user, mfaRequired]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading verification...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!mfaRequired && !loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Completing authorization...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle>Verify Your Identity</CardTitle>
              <CardDescription>
                Complete multi-factor authentication to proceed
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MFA Information */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
            <div className="flex items-start gap-2">
              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Additional Security Required
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  Enter the 6-digit code from your authenticator app to complete
                  the authorization process.
                </p>
              </div>
            </div>
          </div>

          {/* OTP Input */}
          <div className="space-y-2">
            <Label htmlFor="otp">Authentication Code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setOtpCode(value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && otpCode.length === 6) {
                  handleVerify();
                }
              }}
              className="text-center text-2xl tracking-widest font-mono"
              disabled={loading}
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-destructive">
                    Verification Failed
                  </h4>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleVerify}
            disabled={loading || otpCode.length !== 6}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Verify & Authorize
              </>
            )}
          </Button>

          {/* Security Notice */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>
              You are authorizing as <strong>{user?.email}</strong>
            </p>
            <p>
              This code is time-sensitive. Get a new code if this one has
              expired.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/30 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
