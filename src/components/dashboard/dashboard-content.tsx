"use client";

import { useState } from "react";
import {
  Users,
  AppWindow,
  Shield,
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  FileText,
  Briefcase,
  Building2,
  Calendar,
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
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGate } from "@/components/guards/permission-gate";
import { dashboardApi, workflowsApi } from "@/lib/api";
import type { DashboardStats, ActivityItem } from "@/lib/server-api";
import type { WorkflowListItem } from "@/lib/workflow.types";

interface DashboardContentProps {
  initialStats: DashboardStats | null;
  initialActivity: ActivityItem[];
  initialWorkflows: WorkflowListItem[];
}

// Skeleton card component for loading state
function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

// Skeleton organization card
function SkeletonOrgCard() {
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard Content - Client Component
 *
 * Receives pre-fetched data as props from server component.
 * Handles client-side refresh functionality.
 */
export function DashboardContent({
  initialStats,
  initialActivity,
  initialWorkflows,
}: DashboardContentProps) {
  const [data, setData] = useState<DashboardStats | null>(initialStats);
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [workflows, setWorkflows] =
    useState<WorkflowListItem[]>(initialWorkflows);
  const [loading, setLoading] = useState(false);

  // Refresh data client-side
  const refreshData = async () => {
    setLoading(true);

    const [statsResult, activityResult, workflowsResult] = await Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getActivity(10),
      workflowsApi.list(),
    ]);

    if (statsResult.data) {
      setData(statsResult.data);
    }

    if (activityResult.data?.activity) {
      setActivity(activityResult.data.activity);
    }

    if (workflowsResult.data?.workflows) {
      setWorkflows(workflowsResult.data.workflows);
    }

    setLoading(false);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Format action for display
  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Get action status color
  const getActionStatus = (action: string): "success" | "error" | "warning" => {
    if (
      action.includes("failed") ||
      action.includes("error") ||
      action.includes("blocked")
    ) {
      return "error";
    }
    if (action.includes("warning") || action.includes("risk")) {
      return "warning";
    }
    return "success";
  };

  return (
    <div className="space-y-6">
      {/* Page Header - Always visible */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your identity management system
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Organization Overview Card */}
      {loading && !data ? (
        <SkeletonOrgCard />
      ) : data?.organization ? (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organization Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-14 w-14 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold truncate">
                  {data.organization.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground mt-1">
                  <span className="truncate">
                    {data.organization.domain || "No domain configured"}
                  </span>
                  <Badge variant="secondary" className="capitalize shrink-0">
                    {data.organization.plan} plan
                  </Badge>
                </div>
              </div>
              <div className="text-sm text-muted-foreground sm:text-right shrink-0">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Member since{" "}
                    {new Date(data.organization.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Primary Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading && !data ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <PermissionGate permission="users:read">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.users.total || 0}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {data?.users.active || 0} active
                    </p>
                    {(data?.users.newThisWeek || 0) > 0 && (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-300 bg-green-50"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />+
                        {data?.users.newThisWeek} this week
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </PermissionGate>

            <PermissionGate permission="clients:read">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Applications
                  </CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <AppWindow className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.clients.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    OAuth/OIDC clients
                  </p>
                </CardContent>
              </Card>
            </PermissionGate>

            <PermissionGate permission="sessions:read">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Sessions
                  </CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.sessions.active || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {data?.sessions.uniqueUsers || 0} unique users online
                  </p>
                </CardContent>
              </Card>
            </PermissionGate>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Trusted Devices
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.security.trustedDevices || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Registered devices
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Activity & Workflow Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {loading && !data ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Activity Logs
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.activity.totalLogs || 0}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{data?.activity.logsToday || 0} today</span>
                  <span>{data?.activity.logsThisWeek || 0} this week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Security Events
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {data?.security.highRiskEvents || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">High Risk</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      {data?.security.mediumRiskEvents || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Medium Risk</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {data?.security.blockedAttempts || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Blocked</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <PermissionGate permission="workflows:read">
              <Card
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => (window.location.href = "/dashboard/workflows")}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Workflows
                  </CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workflows.length}</div>
                  <div className="flex items-center gap-2 mt-2">
                    {workflows.filter((w) => w.status === "published").length >
                      0 && (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-300 bg-green-50 text-xs"
                      >
                        {
                          workflows.filter((w) => w.status === "published")
                            .length
                        }{" "}
                        published
                      </Badge>
                    )}
                    {workflows.filter((w) => w.status === "draft").length >
                      0 && (
                      <Badge variant="secondary" className="text-xs">
                        {workflows.filter((w) => w.status === "draft").length}{" "}
                        draft
                      </Badge>
                    )}
                    {workflows.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No workflows yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </PermissionGate>
          </>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Security Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Security Overview
            </CardTitle>
            <CardDescription>Current security status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && !data ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : (
              <>
                {(data?.users.total || 0) === 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900 text-sm">
                        No users in organization
                      </p>
                      <p className="text-xs text-amber-700">
                        Add users to get started
                      </p>
                    </div>
                  </div>
                )}
                {(data?.clients.total || 0) === 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900 text-sm">
                        No applications registered
                      </p>
                      <p className="text-xs text-amber-700">
                        Register OAuth clients to enable SSO
                      </p>
                    </div>
                  </div>
                )}
                {(data?.security.highRiskEvents || 0) > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900 text-sm">
                        {data?.security.highRiskEvents} high-risk events
                      </p>
                      <p className="text-xs text-red-700">
                        Review in Fingerprinting section
                      </p>
                    </div>
                  </div>
                )}
                {(data?.users.total || 0) > 0 &&
                  (data?.security.highRiskEvents || 0) === 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                      <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900 text-sm">
                          Security posture is strong
                        </p>
                        <p className="text-xs text-green-700">
                          No critical issues detected
                        </p>
                      </div>
                    </div>
                  )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest events in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading && activity.length === 0 ? (
                <>
                  <div className="flex gap-3">
                    <Skeleton className="h-2 w-2 rounded-full mt-2" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-2 w-2 rounded-full mt-2" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-40 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-2 w-2 rounded-full mt-2" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-36 mb-1" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                </>
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              ) : (
                activity.slice(0, 5).map((item) => {
                  const status = getActionStatus(item.action);
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                    >
                      <div
                        className={`h-2 w-2 rounded-full mt-2 ${
                          status === "success"
                            ? "bg-green-500"
                            : status === "error"
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {formatAction(item.action)}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {item.userName || item.userEmail || "System"}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
