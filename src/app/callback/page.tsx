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
import { CheckCircle, XCircle, Code, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

function CallbackContent() {
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle>Authorization Failed</CardTitle>
                <CardDescription>
                  The authorization request was denied
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Error</span>
                <Badge variant="destructive">{error}</Badge>
              </div>
              {errorDescription && (
                <p className="text-sm text-muted-foreground">
                  {errorDescription}
                </p>
              )}
            </div>
            {state && (
              <div className="text-sm">
                <span className="text-muted-foreground">State:</span>{" "}
                <code className="bg-muted px-2 py-0.5 rounded">{state}</code>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle>Authorization Successful</CardTitle>
              <CardDescription>
                You have successfully authorized the application
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Authorization Code */}
          {code && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Authorization Code
                </label>
                <Badge variant="outline" className="font-mono text-xs">
                  Valid for 10 minutes
                </Badge>
              </div>
              <div className="relative">
                <div className="p-4 rounded-lg bg-muted/50 border font-mono text-sm break-all">
                  {code}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(code)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* State Parameter */}
          {state && (
            <div className="space-y-2">
              <label className="text-sm font-medium">State Parameter</label>
              <div className="relative">
                <div className="p-4 rounded-lg bg-muted/50 border font-mono text-sm break-all">
                  {state}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(state)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Next Steps
            </h3>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Exchange this authorization code for an access token</li>
              <li>
                Call POST /api/oauth/token with the code and client credentials
              </li>
              <li>Use the access token to make authenticated API requests</li>
            </ol>
          </div>

          {/* Example Token Exchange */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Example Token Exchange
            </label>
            <pre className="p-4 rounded-lg bg-muted/50 border text-xs overflow-x-auto">
              {`POST http://localhost:5000/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "${code}",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "http://localhost:3000/callback"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30" />}>
      <CallbackContent />
    </Suspense>
  );
}
