"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Shield,
  Key,
  CreditCard,
  Loader2,
  Save,
  CheckCircle,
  Copy,
  AlertTriangle,
  Trash2,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PermissionGate } from "@/components/guards/permission-gate";
import { settingsApi, organizationsApi } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface OrgSettings {
  id: string;
  name: string;
  domain: string;
  plan: string;
  createdAt: string;
}

interface SecuritySettings {
  sessionTimeout: number;
  mfaPolicy: string;
  mfaEnabledUsers: number;
  totalUsers: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecial: boolean;
  };
  loginThrottling: boolean;
}

interface MfaStatus {
  enabled: boolean;
  methods: Array<{
    id: string;
    type: string;
    verified: boolean;
    createdAt: string;
  }>;
}

interface EnrollmentData {
  id: string;
  secret: string;
  totpUri: string;
  message: string;
}

/**
 * Settings Page Content
 *
 * Tabbed settings for organization, security, MFA, and billing
 */
function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("organization");

  // Organization state
  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSuccess, setOrgSuccess] = useState(false);
  const [orgError, setOrgError] = useState("");

  // Security state
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [securityLoading, setSecurityLoading] = useState(true);

  // MFA state
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [mfaError, setMfaError] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  // Delete org state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Check for tab query parameter on mount
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["organization", "security", "mfa", "billing"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Load data on mount
  useEffect(() => {
    loadOrganization();
    loadSecurity();
    loadMfaStatus();
  }, []);

  const loadOrganization = async () => {
    setOrgLoading(true);
    const result = await settingsApi.getOrganization();
    if (result.data) {
      setOrg(result.data);
      setOrgName(result.data.name);
      setOrgDomain(result.data.domain);
    }
    setOrgLoading(false);
  };

  const loadSecurity = async () => {
    setSecurityLoading(true);
    const result = await settingsApi.getSecurity();
    if (result.data) {
      setSecurity(result.data);
    }
    setSecurityLoading(false);
  };

  const loadMfaStatus = async () => {
    setMfaLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/mfa/status`, {
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        setMfaStatus(data);
      }
    } catch {
      setMfaError("Failed to load MFA status");
    } finally {
      setMfaLoading(false);
    }
  };

  const saveOrganization = async () => {
    setOrgSaving(true);
    setOrgError("");
    setOrgSuccess(false);

    const result = await settingsApi.updateOrganization({
      name: orgName !== org?.name ? orgName : undefined,
      domain: orgDomain !== org?.domain ? orgDomain : undefined,
    });

    if (result.error) {
      setOrgError(result.error);
    } else if (result.data) {
      setOrg(result.data);
      setOrgSuccess(true);
      setTimeout(() => setOrgSuccess(false), 3000);
    }

    setOrgSaving(false);
  };

  // MFA functions
  const startEnrollment = async () => {
    setEnrolling(true);
    setMfaError("");

    try {
      const response = await fetch(`${API_URL}/api/mfa/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "totp" }),
      });

      const data = await response.json();

      if (response.ok) {
        setEnrollment(data);
      } else {
        setMfaError(data.error || "Failed to start enrollment");
        setEnrolling(false);
      }
    } catch {
      setMfaError("Connection error");
      setEnrolling(false);
    }
  };

  const completeEnrollment = async () => {
    if (!/^\d{6}$/.test(verifyCode)) {
      setMfaError("Please enter a valid 6-digit code");
      return;
    }

    setVerifying(true);
    setMfaError("");

    try {
      const response = await fetch(`${API_URL}/api/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: verifyCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setEnrollment(null);
        setEnrolling(false);
        setVerifyCode("");
        loadMfaStatus();
      } else {
        setMfaError(data.error || "Verification failed");
      }
    } catch {
      setMfaError("Connection error");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!/^\d{6}$/.test(disableCode)) {
      setMfaError("Please enter your current MFA code");
      return;
    }

    setDisabling(true);
    setMfaError("");

    try {
      const response = await fetch(`${API_URL}/api/mfa/disable`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: disableCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setDisableCode("");
        loadMfaStatus();
      } else {
        setMfaError(data.error || "Failed to disable MFA");
      }
    } catch {
      setMfaError("Connection error");
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    if (enrollment?.secret) {
      navigator.clipboard.writeText(enrollment.secret);
    }
  };

  const handleDeleteOrg = async () => {
    if (!org) return;

    const expectedConfirmation = `delete-${org.name
      .toLowerCase()
      .replace(/\s+/g, "-")}`;

    if (deleteConfirmation !== expectedConfirmation) {
      setDeleteError(`Please type "${expectedConfirmation}" to confirm`);
      return;
    }

    setDeleting(true);
    setDeleteError("");

    const result = await organizationsApi.delete(org.id, deleteConfirmation);

    if (result.error) {
      setDeleteError(result.error);
      setDeleting(false);
    } else {
      // Redirect to home page on success
      router.push("/");
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization and security settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Organization</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="mfa" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">MFA</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <PermissionGate
            permission="org:manage"
            fallback={
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  You don&apos;t have permission to manage organization settings
                </CardContent>
              </Card>
            }
          >
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Update your organization&apos;s name and domain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {orgLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    {orgError && (
                      <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        {orgError}
                      </div>
                    )}
                    {orgSuccess && (
                      <div className="p-3 rounded-lg bg-green-100 text-green-800 text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Settings saved successfully
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="org-name">Organization Name</Label>
                      <Input
                        id="org-name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="My Organization"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="org-domain">Domain</Label>
                      <Input
                        id="org-domain"
                        value={orgDomain}
                        onChange={(e) => setOrgDomain(e.target.value)}
                        placeholder="myorg.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used for login and branding
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Plan:{" "}
                        <Badge variant="secondary">{org?.plan || "Free"}</Badge>
                      </div>
                      <Button
                        onClick={saveOrganization}
                        disabled={
                          orgSaving ||
                          (orgName === org?.name && orgDomain === org?.domain)
                        }
                      >
                        {orgSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </PermissionGate>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <PermissionGate
            permission="settings:read"
            fallback={
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  You don&apos;t have permission to view security settings
                </CardContent>
              </Card>
            }
          >
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure authentication and session policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                {securityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">
                          Session Timeout
                        </p>
                        <p className="text-2xl font-bold">
                          {security?.sessionTimeout || 60} min
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">
                          MFA Policy
                        </p>
                        <p className="text-2xl font-bold capitalize">
                          {security?.mfaPolicy || "Optional"}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <h3 className="font-medium mb-3">MFA Adoption</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {security?.mfaEnabledUsers || 0} of{" "}
                          {security?.totalUsers || 0} users have MFA enabled
                        </span>
                        <span className="text-lg font-bold">
                          {security?.totalUsers
                            ? Math.round(
                                (security.mfaEnabledUsers /
                                  security.totalUsers) *
                                  100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <h3 className="font-medium mb-3">Password Policy</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>
                          • Minimum length:{" "}
                          {security?.passwordPolicy?.minLength || 8} characters
                        </li>
                        <li>
                          • Uppercase required:{" "}
                          {security?.passwordPolicy?.requireUppercase
                            ? "Yes"
                            : "No"}
                        </li>
                        <li>
                          • Numbers required:{" "}
                          {security?.passwordPolicy?.requireNumbers
                            ? "Yes"
                            : "No"}
                        </li>
                        <li>
                          • Special characters:{" "}
                          {security?.passwordPolicy?.requireSpecial
                            ? "Required"
                            : "Optional"}
                        </li>
                      </ul>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <p className="font-medium">Login Throttling</p>
                        <p className="text-sm text-muted-foreground">
                          Limit failed login attempts
                        </p>
                      </div>
                      <Badge
                        variant={
                          security?.loginThrottling ? "default" : "secondary"
                        }
                      >
                        {security?.loginThrottling ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </PermissionGate>
        </TabsContent>

        {/* MFA Tab */}
        <TabsContent value="mfa">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Two-Factor Authentication
                    </CardTitle>
                    <CardDescription>
                      Add an extra layer of security to your account
                    </CardDescription>
                  </div>
                </div>
                {mfaStatus?.enabled && (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {mfaLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  {mfaError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      {mfaError}
                    </div>
                  )}

                  {/* MFA Not Enabled */}
                  {!mfaStatus?.enabled && !enrolling && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Protect your account with TOTP-based two-factor
                        authentication. You&apos;ll need an authenticator app
                        like Google Authenticator or Authy.
                      </p>
                      <Button onClick={startEnrollment}>
                        Enable Two-Factor Authentication
                      </Button>
                    </div>
                  )}

                  {/* Enrollment Flow */}
                  {enrollment && (
                    <div className="space-y-6">
                      <div className="p-4 rounded-lg bg-muted">
                        <h3 className="font-medium mb-2">
                          Step 1: Scan QR Code
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Scan this QR code with your authenticator app
                        </p>
                        <div className="flex justify-center p-4 bg-white rounded-lg">
                          <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                              enrollment.totpUri
                            )}`}
                            alt="MFA QR Code"
                            width={200}
                            height={200}
                            className="rounded"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-muted">
                        <h3 className="font-medium mb-2">Manual Entry</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Or enter this secret key manually:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-background rounded text-sm font-mono">
                            {enrollment.secret}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={copySecret}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-medium">Step 2: Verify Code</h3>
                        <p className="text-sm text-muted-foreground">
                          Enter the 6-digit code from your authenticator app
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={verifyCode}
                            onChange={(e) =>
                              setVerifyCode(e.target.value.replace(/\D/g, ""))
                            }
                            className="w-32 text-center font-mono text-lg"
                          />
                          <Button
                            onClick={completeEnrollment}
                            disabled={verifying}
                          >
                            {verifying ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Verify & Enable"
                            )}
                          </Button>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEnrolling(false);
                          setEnrollment(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* MFA Enabled */}
                  {mfaStatus?.enabled && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-green-800">
                              MFA is enabled
                            </p>
                            <p className="text-sm text-green-700">
                              Your account is protected with two-factor
                              authentication
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-start gap-3 mb-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-medium">Disable MFA</p>
                            <p className="text-sm text-muted-foreground">
                              Enter your current MFA code to disable two-factor
                              authentication
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={disableCode}
                            onChange={(e) =>
                              setDisableCode(e.target.value.replace(/\D/g, ""))
                            }
                            className="w-32 text-center font-mono text-lg"
                          />
                          <Button
                            variant="destructive"
                            onClick={handleDisable}
                            disabled={disabling}
                          >
                            {disabling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Disable MFA"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <PermissionGate
            permission="billing:read"
            fallback={
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  You don&apos;t have permission to view billing settings
                </CardContent>
              </Card>
            }
          >
            <Card>
              <CardHeader>
                <CardTitle>Billing & Subscription</CardTitle>
                <CardDescription>
                  Manage your plan and view usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-6 rounded-lg border-2 border-primary">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold">
                          {org?.plan === "professional"
                            ? "Professional Plan"
                            : org?.plan === "starter"
                            ? "Starter Plan"
                            : "Free Plan"}
                        </h3>
                        <p className="text-muted-foreground">
                          Current subscription
                        </p>
                      </div>
                      <Badge variant="default" className="text-sm">
                        Active
                      </Badge>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {org?.plan === "professional"
                          ? "Up to 500 users"
                          : org?.plan === "starter"
                          ? "Up to 50 users"
                          : "Up to 5 users"}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {org?.plan === "professional"
                          ? "Unlimited OAuth clients"
                          : org?.plan === "starter"
                          ? "Up to 10 OAuth clients"
                          : "Up to 2 OAuth clients"}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {org?.plan === "professional"
                          ? "Advanced MFA"
                          : org?.plan === "starter"
                          ? "MFA (TOTP + WebAuthn)"
                          : "Basic MFA (TOTP)"}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {org?.plan === "professional"
                          ? "1-year audit logs"
                          : org?.plan === "starter"
                          ? "30-day audit logs"
                          : "7-day audit logs"}
                      </li>
                      {(org?.plan === "starter" ||
                        org?.plan === "professional") && (
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Custom branding
                        </li>
                      )}
                      {org?.plan === "professional" && (
                        <>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            SSO integrations
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            API access
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Priority support
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  {org?.plan !== "professional" && (
                    <div className="p-4 rounded-lg bg-muted">
                      <h3 className="font-medium mb-2">
                        {org?.plan === "starter"
                          ? "Upgrade to Professional"
                          : "Upgrade Your Plan"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {org?.plan === "starter"
                          ? "Get unlimited clients, SSO, and priority support"
                          : "Get more users, clients, and advanced features"}
                      </p>
                      <Link href="/dashboard/billing">
                        <Button>Upgrade Now</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </PermissionGate>
        </TabsContent>
      </Tabs>

      {/* Danger Zone - Delete Organization */}
      <PermissionGate permission="org:delete">
        <Card className="mt-8 border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div>
                <p className="font-medium">Delete Organization</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this organization and all its data
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      </PermissionGate>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Organization
            </DialogTitle>
            <DialogDescription>
              This action is <strong>irreversible</strong>. All users, clients,
              sessions, and data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {deleteError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {deleteError}
              </div>
            )}

            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm font-medium mb-2">This will:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Disable all users permanently</li>
                <li>• Revoke all active sessions</li>
                <li>• Delete all OAuth clients</li>
                <li>• Remove all MFA configurations</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label>
                Type{" "}
                <code className="px-1 py-0.5 bg-muted rounded text-destructive font-mono">
                  delete-{org?.name.toLowerCase().replace(/\s+/g, "-")}
                </code>{" "}
                to confirm
              </Label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="delete-organization-name"
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmation("");
                setDeleteError("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrg}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Loading fallback for Suspense
function SettingsLoading() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization and security settings
        </p>
      </div>
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent />
    </Suspense>
  );
}
