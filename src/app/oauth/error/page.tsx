"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
  AlertCircle,
  XCircle,
  ShieldAlert,
  Lock,
  Globe,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface OAuthError {
  code: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  variant: "destructive" | "warning" | "default";
  userGuidance?: string;
}

const ERROR_TYPES: Record<string, OAuthError> = {
  invalid_client: {
    code: "invalid_client",
    title: "Invalid Client",
    description: "The client application was not found or is disabled.",
    icon: <ShieldAlert className="h-5 w-5" />,
    variant: "destructive",
    userGuidance:
      "The application you're trying to access is not registered or has been disabled. Please contact the application owner.",
  },
  invalid_client_secret: {
    code: "invalid_client_secret",
    title: "Invalid Client Credentials",
    description: "The client credentials are incorrect.",
    icon: <Lock className="h-5 w-5" />,
    variant: "destructive",
    userGuidance:
      "The application failed to authenticate. Please contact the application developer.",
  },
  invalid_redirect_uri: {
    code: "invalid_redirect_uri",
    title: "Invalid Redirect URI",
    description: "The redirect URI is not registered for this client.",
    icon: <Globe className="h-5 w-5" />,
    variant: "destructive",
    userGuidance:
      "The application is trying to redirect to an unauthorized location. This may be a security issue. Please contact the application owner.",
  },
  mfa_required: {
    code: "mfa_required",
    title: "MFA Required",
    description: "Multi-factor authentication is required to proceed.",
    icon: <ShieldAlert className="h-5 w-5" />,
    variant: "warning",
    userGuidance:
      "You must provide a valid 6-digit OTP code to authorize this application.",
  },
  otp_failed: {
    code: "otp_failed",
    title: "Invalid OTP",
    description: "The OTP code you provided is incorrect.",
    icon: <XCircle className="h-5 w-5" />,
    variant: "destructive",
    userGuidance:
      "Please check your authenticator app and try again with a new code.",
  },
  access_denied: {
    code: "access_denied",
    title: "Access Denied",
    description: "Authorization was denied.",
    icon: <XCircle className="h-5 w-5" />,
    variant: "destructive",
    userGuidance:
      "You denied the authorization request or verification failed. If this was a mistake, you can try again.",
  },
  unauthorized_client: {
    code: "unauthorized_client",
    title: "Client Disabled",
    description: "This client application has been disabled.",
    icon: <ShieldAlert className="h-5 w-5" />,
    variant: "destructive",
    userGuidance:
      "The application has been disabled by an administrator. Please contact the application owner.",
  },
  unsupported_response_type: {
    code: "unsupported_response_type",
    title: "Unsupported Response Type",
    description: "The requested response type is not supported.",
    icon: <AlertCircle className="h-5 w-5" />,
    variant: "warning",
    userGuidance:
      "The application is using an unsupported authorization flow. Please contact the application developer.",
  },
  invalid_request: {
    code: "invalid_request",
    title: "Invalid Request",
    description: "The authorization request is missing required parameters.",
    icon: <AlertCircle className="h-5 w-5" />,
    variant: "warning",
    userGuidance:
      "The authorization request is malformed. Please contact the application developer.",
  },
  too_many_requests: {
    code: "too_many_requests",
    title: "Too Many Requests",
    description: "You have made too many requests. Please try again later.",
    icon: <AlertCircle className="h-5 w-5" />,
    variant: "warning",
    userGuidance: "Please wait a moment before trying again.",
  },
  server_error: {
    code: "server_error",
    title: "Server Error",
    description: "An unexpected error occurred on the server.",
    icon: <AlertCircle className="h-5 w-5" />,
    variant: "destructive",
    userGuidance:
      "An unexpected error occurred. Please try again later or contact support if the problem persists.",
  },
};

function OAuthErrorContent() {
  const searchParams = useSearchParams();

  const errorCode = searchParams.get("error") || "unknown";
  const errorDescription =
    searchParams.get("error_description") || searchParams.get("message");
  const state = searchParams.get("state");

  // Get error details or use default
  const error: OAuthError = ERROR_TYPES[errorCode] || {
    code: errorCode,
    title: "Authorization Error",
    description: errorDescription || "An unknown error occurred.",
    icon: <AlertCircle className="h-5 w-5" />,
    variant: "destructive" as const,
    userGuidance: "Please try again or contact support.",
  };

  const variantStyles = {
    destructive: {
      bg: "bg-destructive/10",
      border: "border-destructive/20",
      text: "text-destructive",
    },
    warning: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      text: "text-yellow-600 dark:text-yellow-500",
    },
    default: {
      bg: "bg-muted/50",
      border: "border-muted",
      text: "text-foreground",
    },
  };

  const style = variantStyles[error.variant];

  // Map error variant to Badge variant (Badge doesn't support "warning")
  const getBadgeVariant = (
    variant: "destructive" | "warning" | "default"
  ): "destructive" | "default" | "outline" | "secondary" => {
    if (variant === "warning") return "secondary";
    return variant;
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full ${style.bg} flex items-center justify-center`}
            >
              <div className={style.text}>{error.icon}</div>
            </div>
            <div>
              <CardTitle>{error.title}</CardTitle>
              <CardDescription>OAuth Authorization Error</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Details */}
          <div className={`p-4 rounded-lg ${style.bg} border ${style.border}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Error Code</span>
              <Badge variant={getBadgeVariant(error.variant)}>
                {error.code}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {errorDescription || error.description}
            </p>
          </div>

          {/* User Guidance */}
          {error.userGuidance && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                What to do next
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {error.userGuidance}
              </p>
            </div>
          )}

          {/* State Parameter (for debugging) */}
          {state && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">State:</span>{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">{state}</code>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OAuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30" />}>
      <OAuthErrorContent />
    </Suspense>
  );
}
