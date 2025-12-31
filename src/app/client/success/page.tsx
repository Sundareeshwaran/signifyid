"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Clock } from "lucide-react";
import { useClientAuth } from "@/hooks/useClientAuth";

export default function ClientSuccessPage() {
  const { getSessionExpiry, logout } = useClientAuth();
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);

  useEffect(() => {
    setExpiryTime(getSessionExpiry());
  }, [getSessionExpiry]);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/client/login";
    } catch (error) {
      console.error("Logout error:", error);
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
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
          </div>
          <CardTitle className="text-2xl">Authentication Successful</CardTitle>
          <CardDescription>
            You have been successfully authenticated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Session expires:</span>
            </div>
            <p className="font-mono text-sm font-semibold">
              {expiryTime ? expiryTime.toLocaleString() : "Loading..."}
            </p>
          </div>

          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              Logout
            </Button>
          </div>

          <div className="pt-4 border-t text-center text-sm text-muted-foreground">
            <p>Your session will remain active for 24 hours.</p>
            <p className="mt-1">You can safely close this window.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
