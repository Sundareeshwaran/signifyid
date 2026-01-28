"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, ArrowLeft, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * MFA Challenge Content
 */
function MFAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get userId from URL params (set by login page)
  const userId = searchParams.get("userId");

  useEffect(() => {
    if (!userId) {
      // No userId - redirect to login
      router.push("/login");
    }
  }, [userId, router]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (index === 5 && value) {
      handleSubmit(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);

    // Focus the next empty input or the last one
    const nextEmpty = newCode.findIndex((c) => !c);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();

    // Auto-submit if complete
    if (pastedData.length === 6) {
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (fullCode?: string) => {
    const codeToVerify = fullCode || code.join("");

    if (!/^\d{6}$/.test(codeToVerify)) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    if (!userId) {
      setError("Session expired. Please login again.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/mfa/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, code: codeToVerify }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verification failed");
        setIsLoading(false);
        // Clear code on error
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch {
      setError("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Login */}
        <Link
          href="/login"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to login
        </Link>

        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>Verify your identity to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              Enter the 6-digit code from your authenticator app
            </div>

            {/* Code Input */}
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-xl font-bold"
                  disabled={isLoading}
                />
              ))}
            </div>

            {/* Verify Button */}
            <Button
              onClick={() => handleSubmit()}
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading || code.some((c) => !c)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Lost access to your authenticator?{" "}
              <Link href="#" className="text-primary hover:underline">
                Use recovery code
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * MFA Challenge Page
 *
 * Second step of authentication - TOTP code verification
 */
export default function MFAPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/30 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <MFAContent />
    </Suspense>
  );
}
