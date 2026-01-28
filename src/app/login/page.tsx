"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  Building2,
  AlertCircle,
  Fingerprint,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isValidEmail } from "@/lib/auth";
import {
  isWebAuthnSupported,
  loginWithPasskey,
  checkPasskeys,
} from "@/lib/webauthn";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Google Logo SVG Component
 */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * Login Page Content Component
 */
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "true";
  const errorParam = searchParams.get("error");

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(getErrorMessage(errorParam));
  const [showSsoModal, setShowSsoModal] = useState(false);
  const [ssoEmail, setSsoEmail] = useState("");
  const [ssoError, setSsoError] = useState("");
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyEmail, setPasskeyEmail] = useState("");
  const [passkeyError, setPasskeyError] = useState("");
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);

  useEffect(() => {
    setWebAuthnSupported(isWebAuthnSupported());
  }, []);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  function getErrorMessage(errorCode: string | null): string {
    if (!errorCode) return "";
    const errorMessages: Record<string, string> = {
      oauth_denied: "Google sign-in was cancelled",
      oauth_init_failed: "Failed to start Google sign-in",
      oauth_callback_failed: "Google sign-in failed. Please try again.",
      token_exchange_failed: "Authentication failed. Please try again.",
      userinfo_failed: "Failed to get user information",
      invalid_state: "Session expired. Please try again.",
      account_disabled: "Your account has been disabled",
      sso_denied: "SSO sign-in was cancelled",
      sso_callback_failed: "SSO sign-in failed. Please try again.",
      idp_not_found: "SSO provider not found",
      idp_misconfigured: "SSO is not properly configured for your organization",
      org_mismatch: "Account belongs to a different organization",
    };
    return errorMessages[errorCode] || "An error occurred. Please try again.";
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { authApi } = await import("@/lib/api");
      const result = await authApi.login({
        email: formData.email,
        password: formData.password,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      // Check if MFA is required
      if (result.data?.mfaRequired) {
        router.push(`/mfa?userId=${encodeURIComponent(result.data.userId)}`);
      } else {
        // Skip MFA, go directly to dashboard
        router.push("/dashboard");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    // Redirect to Google OAuth endpoint
    window.location.href = `${API_URL}/auth/google`;
  };

  const handlePasskeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeyError("");

    if (!passkeyEmail) {
      setPasskeyError("Please enter your email");
      return;
    }

    if (!isValidEmail(passkeyEmail)) {
      setPasskeyError("Please enter a valid email address");
      return;
    }

    setIsPasskeyLoading(true);

    try {
      // Check if user has passkeys first
      const { hasPasskeys } = await checkPasskeys(passkeyEmail);
      if (!hasPasskeys) {
        setPasskeyError(
          "No passkeys found for this email. Please sign in with password first and register a passkey.",
        );
        setIsPasskeyLoading(false);
        return;
      }

      // Attempt passkey login
      const result = await loginWithPasskey(passkeyEmail);

      if (!result.success) {
        setPasskeyError(result.error || "Passkey authentication failed");
        setIsPasskeyLoading(false);
        return;
      }

      // Success! Redirect to dashboard
      router.push("/dashboard");
    } catch {
      setPasskeyError("Passkey authentication failed. Please try again.");
      setIsPasskeyLoading(false);
    }
  };

  const handleSsoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSsoError("");

    if (!ssoEmail) {
      setSsoError("Please enter your work email");
      return;
    }

    if (!isValidEmail(ssoEmail)) {
      setSsoError("Please enter a valid email address");
      return;
    }

    setIsSsoLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/sso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ssoEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSsoError(
          data.message || data.error || "SSO is not available for this domain",
        );
        setIsSsoLoading(false);
        return;
      }

      // Redirect to IdP
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch {
      setSsoError("Failed to start SSO. Please try again.");
      setIsSsoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div
        className="absolute inset-0 bg-no-repeat bg-cover bg-center dark:hidden"
        style={{ backgroundImage: "url('/welcome_blob_light.svg')" }}
      />
      <div
        className="absolute inset-0 bg-no-repeat bg-cover bg-center hidden dark:block"
        style={{ backgroundImage: "url('/welcome_blob_dark.svg')" }}
      />
      <div className="w-full max-w-md relative z-10">
        {/* Back to Home */}
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to home
        </Link>

        {/* Success Message */}
        {justRegistered && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Organization created successfully! Sign in to continue.
            </p>
          </div>
        )}

        {/* OAuth Error Message */}
        {errorParam && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              {getErrorMessage(errorParam)}
            </p>
          </div>
        )}

        <Card className="border-0 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold">
              Welcome back
            </CardTitle>
            <CardDescription>
              Sign in to your Signify iD account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-11 text-sm font-medium hover:bg-muted/50 transition-all"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleLogo className="mr-2 h-4 w-4" />
                )}
                Continue with Google
              </Button>

              <Button
                variant="outline"
                className="w-full h-11 text-sm font-medium hover:bg-muted/50 transition-all"
                onClick={() => setShowSsoModal(true)}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Continue with SSO
              </Button>

              {webAuthnSupported && (
                <Button
                  variant="outline"
                  className="w-full h-11 text-sm font-medium hover:bg-muted/50 transition-all border-primary/20 bg-primary/5"
                  onClick={() => setShowPasskeyModal(true)}
                >
                  <Fingerprint className="mr-2 h-4 w-4 text-primary" />
                  Sign in with Passkey
                </Button>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && !errorParam && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@acme.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  className="h-11"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="#"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    className="pr-10 h-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Register Link */}
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an organization?{" "}
              <Link
                href="/register"
                className="text-primary font-medium hover:underline"
              >
                Create one
              </Link>
            </div>

            {/* Terms */}
            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to our{" "}
              <Link href="#" className="underline hover:text-foreground">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="#" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SSO Modal */}
      <Dialog open={showSsoModal} onOpenChange={setShowSsoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Sign in with SSO
            </DialogTitle>
            <DialogDescription>
              Enter your work email to continue with your organization&apos;s
              identity provider.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSsoSubmit} className="space-y-4">
            {ssoError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {ssoError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="sso-email">Work Email</Label>
              <Input
                id="sso-email"
                type="email"
                placeholder="you@company.com"
                value={ssoEmail}
                onChange={(e) => {
                  setSsoEmail(e.target.value);
                  setSsoError("");
                }}
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowSsoModal(false);
                  setSsoError("");
                  setSsoEmail("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSsoLoading}>
                {isSsoLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Passkey Modal */}
      <Dialog open={showPasskeyModal} onOpenChange={setShowPasskeyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              Sign in with Passkey
            </DialogTitle>
            <DialogDescription>
              Use your fingerprint, Face ID, or Windows Hello to sign in
              securely without a password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasskeyLogin} className="space-y-4">
            {passkeyError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {passkeyError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="passkey-email">Email</Label>
              <Input
                id="passkey-email"
                type="email"
                placeholder="you@company.com"
                value={passkeyEmail}
                onChange={(e) => {
                  setPasskeyEmail(e.target.value);
                  setPasskeyError("");
                }}
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowPasskeyModal(false);
                  setPasskeyError("");
                  setPasskeyEmail("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isPasskeyLoading}
              >
                {isPasskeyLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Login Page
 *
 * Multi-auth login supporting Email/Password, Google OAuth, and Enterprise SSO
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/30 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
