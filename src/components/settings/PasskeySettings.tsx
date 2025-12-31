"use client";

import { useState, useEffect } from "react";
import {
  Fingerprint,
  Plus,
  Trash2,
  Loader2,
  Key,
  Smartphone,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  isWebAuthnSupported,
  registerPasskey,
  listPasskeys,
  deletePasskey,
} from "@/lib/webauthn";

interface Passkey {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
}

export function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [webAuthnSupported] = useState(() => isWebAuthnSupported());

  useEffect(() => {
    loadPasskeys();
  }, []);

  async function loadPasskeys() {
    setIsLoading(true);
    try {
      const { passkeys } = await listPasskeys();
      setPasskeys(passkeys);
    } catch (err) {
      console.error("Failed to load passkeys:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister() {
    if (!deviceName.trim()) {
      setError("Please enter a device name");
      return;
    }

    setIsRegistering(true);
    setError("");

    try {
      const result = await registerPasskey(deviceName);

      if (result.success) {
        setShowRegisterDialog(false);
        setDeviceName("");
        loadPasskeys();
      } else {
        setError(result.error || "Registration failed");
      }
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      const result = await deletePasskey(id);
      if (result.success) {
        setPasskeys((prev) => prev.filter((p) => p.id !== id));
      }
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!webAuthnSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Passkeys
          </CardTitle>
          <CardDescription>
            Your browser doesn&apos;t support passkeys. Please use a modern
            browser like Chrome, Edge, Safari, or Firefox.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Passkeys
            </CardTitle>
            <CardDescription>
              Sign in securely with biometrics like fingerprint or Face ID
            </CardDescription>
          </div>
          <Dialog
            open={showRegisterDialog}
            onOpenChange={setShowRegisterDialog}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Passkey
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Register New Passkey
                </DialogTitle>
                <DialogDescription>
                  Use your device&apos;s biometric authentication (fingerprint,
                  Face ID, Windows Hello) to create a passkey.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="device-name">Device Name</Label>
                  <Input
                    id="device-name"
                    placeholder="e.g., MacBook Pro, iPhone, Windows PC"
                    value={deviceName}
                    onChange={(e) => {
                      setDeviceName(e.target.value);
                      setError("");
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    A friendly name to identify this device
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowRegisterDialog(false);
                      setDeviceName("");
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleRegister}
                    disabled={isRegistering}
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="mr-2 h-4 w-4" />
                        Register Passkey
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No passkeys registered</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a passkey to sign in faster and more securely using your
              fingerprint or Face ID.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegisterDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Passkey
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Smartphone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {passkey.deviceName || "Passkey"}
                      </span>
                      {passkey.backedUp && (
                        <Badge variant="secondary" className="text-xs">
                          Synced
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created {formatDate(passkey.createdAt)}
                      </span>
                      {passkey.lastUsedAt && (
                        <span>Last used {formatDate(passkey.lastUsedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteId(passkey.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Passkey?</AlertDialogTitle>
            <AlertDialogDescription>
              This passkey will be permanently removed. You won&apos;t be able
              to use it to sign in anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
