"use client";

import { useEffect, useState } from "react";
import {
  Fingerprint,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { fingerprintingApi } from "@/lib/api";

// Types
interface FingerprintSettings {
  deviceFingerprint: boolean;
  browserFingerprint: boolean;
  ipRiskAnalysis: boolean;
  geoVelocity: boolean;
  deviceBinding: boolean;
}

interface RiskEvent {
  id: string;
  userEmail: string;
  eventType: string;
  riskScore: number;
  createdAt: string;
}

interface Stats {
  trustedDevices: number;
  mediumRiskEvents: number;
  highRiskEvents: number;
  blockedAttempts: number;
}

// Setting config for display
const settingConfig = [
  {
    id: "deviceFingerprint" as keyof FingerprintSettings,
    label: "Device Fingerprinting",
    description: "Collect device fingerprints for fraud detection",
  },
  {
    id: "browserFingerprint" as keyof FingerprintSettings,
    label: "Browser Fingerprinting",
    description: "Analyze browser characteristics for identification",
  },
  {
    id: "ipRiskAnalysis" as keyof FingerprintSettings,
    label: "IP Risk Analysis",
    description: "Check IP addresses against known threat databases",
  },
  {
    id: "geoVelocity" as keyof FingerprintSettings,
    label: "Geo-Velocity Checks",
    description: "Detect impossible travel patterns",
  },
  {
    id: "deviceBinding" as keyof FingerprintSettings,
    label: "Device Binding",
    description: "Require known devices for sensitive operations",
  },
];

/**
 * Fingerprinting Page
 *
 * Device fingerprinting and risk detection settings with real-time data
 */
export default function FingerprintingPage() {
  const [settings, setSettings] = useState<FingerprintSettings>({
    deviceFingerprint: true,
    browserFingerprint: true,
    ipRiskAnalysis: true,
    geoVelocity: false,
    deviceBinding: false,
  });
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [stats, setStats] = useState<Stats>({
    trustedDevices: 0,
    mediumRiskEvents: 0,
    highRiskEvents: 0,
    blockedAttempts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [settingsRes, eventsRes, statsRes] = await Promise.all([
        fingerprintingApi.getSettings(),
        fingerprintingApi.getRiskEvents(),
        fingerprintingApi.getStats(),
      ]);

      if (settingsRes.data?.settings) {
        setSettings(settingsRes.data.settings);
      }

      if (eventsRes.data?.riskEvents) {
        setRiskEvents(eventsRes.data.riskEvents);
      }

      if (statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }
    } catch (err) {
      console.error("Failed to load fingerprinting data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (
    key: keyof FingerprintSettings,
    value: boolean
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const result = await fingerprintingApi.updateSettings(settings);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to determine risk level from score
  const getRiskLevel = (score: number): "low" | "medium" | "high" => {
    if (score > 0.7) return "high";
    if (score > 0.3) return "medium";
    return "low";
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHours > 0)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  const riskColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Loading fingerprinting data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Fingerprinting & Risk Detection
          </h1>
          <p className="text-muted-foreground">
            Configure device identification and fraud prevention
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Detection Settings</CardTitle>
                <CardDescription>
                  Configure what signals to collect
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {settingConfig.map((setting) => (
              <div
                key={setting.id}
                className="flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <Label htmlFor={setting.id} className="text-sm font-medium">
                    {setting.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
                <Switch
                  id={setting.id}
                  checked={settings[setting.id]}
                  onCheckedChange={(checked) =>
                    handleSettingChange(setting.id, checked)
                  }
                />
              </div>
            ))}
            <Button
              className="w-full mt-4"
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Risk Events Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Risk Events</CardTitle>
                  <CardDescription>
                    Suspicious activity detected
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {riskEvents.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>No risk events detected</p>
                <p className="text-sm">Your organization is secure</p>
              </div>
            ) : (
              <div className="space-y-4">
                {riskEvents.slice(0, 5).map((event) => {
                  const risk = getRiskLevel(event.riskScore);
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        {risk === "high" ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : risk === "medium" ? (
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {event.eventType}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.userEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={riskColors[risk]}>{risk}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(event.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4">
              View All Events
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {stats.trustedDevices}
              </p>
              <p className="text-sm text-muted-foreground">Trusted Devices</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">
                {stats.mediumRiskEvents}
              </p>
              <p className="text-sm text-muted-foreground">
                Medium Risk Events
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {stats.highRiskEvents}
              </p>
              <p className="text-sm text-muted-foreground">High Risk Events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.blockedAttempts}</p>
              <p className="text-sm text-muted-foreground">Blocked Attempts</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
