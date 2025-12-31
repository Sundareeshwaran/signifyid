"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Key,
  Shield,
  Activity,
  TrendingUp,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { analyticsApi, dashboardApi, securityApi } from "@/lib/api";

interface AnalyticsData {
  users: {
    total: number;
    active: number;
    disabled: number;
    invited: number;
    new7Days: number;
    new30Days: number;
    mfaEnabled: number;
    mfaPercentage: number;
  };
  sessions: {
    active: number;
    uniqueUsers: number;
    byClient: Array<{
      clientName: string;
      clientId: string;
      sessionCount: number;
    }>;
  };
  clients: {
    clients: Array<{
      id: string;
      clientId: string;
      name: string;
      createdAt: string;
      activeTokens: number;
      totalTokens: number;
      logins30d: number;
    }>;
    totalClients: number;
  };
  security: {
    riskEvents: {
      high: number;
      medium: number;
      low: number;
      blocked: number;
    };
    failedLogins: {
      last24h: number;
      last7d: number;
    };
    mfaFailures: number;
  };
  loginTrends: Array<{
    date: string;
    success: number;
    failed: number;
  }>;
}

interface ActivityItem {
  id: string;
  action: string;
  meta: Record<string, any>;
  createdAt: string;
  userEmail: string;
  userName: string | null;
}

/**
 * Analytics Page
 *
 * Real-time analytics with data from API
 */
export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loginActivityData, setLoginActivityData] = useState<
    Array<{ date: string; count: number }>
  >([]);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");
  const [securityData, setSecurityData] = useState<{
    highRisk: number;
    mediumRisk: number;
    failedLogins24h: number;
    blockedAttempts: number;
    officeHoursAnomalies: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    const [
      analyticsResult,
      activityResult,
      loginActivityResult,
      securityResult,
    ] = await Promise.all([
      analyticsApi.getOverview(),
      dashboardApi.getActivity(10),
      analyticsApi.getLoginActivities(timeRange, "day"),
      securityApi.getOverview(),
    ]);

    if (analyticsResult.error) {
      setError(analyticsResult.error);
    } else if (analyticsResult.data) {
      setData(analyticsResult.data);
    }

    if (activityResult.data?.activity) {
      setActivity(activityResult.data.activity);
    }

    if (loginActivityResult.data?.data) {
      setLoginActivityData(loginActivityResult.data.data);
    }

    if (securityResult.data) {
      setSecurityData(securityResult.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!loading) {
      loadLoginActivity();
    }
  }, [timeRange]);

  const loadLoginActivity = async () => {
    const result = await analyticsApi.getLoginActivities(timeRange, "day");
    if (result.data?.data) {
      setLoginActivityData(result.data.data);
    }
  };

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

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, " ")
      .replace(/\./g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatChartDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {error === "Insufficient permissions" ? (
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>You don't have permission to view analytics</span>
            </div>
          ) : (
            error
          )}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Users",
      value: data?.users.total || 0,
      change: `${data?.users.new7Days || 0} new this week`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "OAuth Clients",
      value: data?.clients.totalClients || 0,
      change: "Registered applications",
      icon: Key,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "MFA Enabled",
      value: data?.users.mfaEnabled || 0,
      change: `${data?.users.mfaPercentage || 0}% adoption`,
      icon: Shield,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Active Sessions",
      value: data?.sessions.active || 0,
      change: `${data?.sessions.uniqueUsers || 0} unique users`,
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Real-time usage statistics and metrics
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.change}
                  </p>
                </div>
                <div
                  className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                >
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Login Activity - Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Login Activity
                </CardTitle>
                <CardDescription>
                  Authentication events over time
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={timeRange === "7d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange("7d")}
                >
                  7 days
                </Button>
                <Button
                  variant={timeRange === "30d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange("30d")}
                >
                  30 days
                </Button>
                <Button
                  variant={timeRange === "90d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange("90d")}
                >
                  90 days
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loginActivityData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={loginActivityData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorLogins"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--chart-1)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--chart-1)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      className="text-xs"
                      stroke="#888888"
                    />
                    <YAxis className="text-xs" stroke="#888888" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-lg">
                              <div className="grid gap-2">
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">
                                    {formatChartDate(payload[0].payload.date)}
                                  </span>
                                  <span className="font-bold text-lg">
                                    {payload[0].value} logins
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorLogins)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No login activity recorded in this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Overview
            </CardTitle>
            <CardDescription>
              Real-time security metrics (last 7 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* High Risk Events */}
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-900 dark:text-red-400">
                    High Risk
                  </span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {securityData?.highRisk ?? 0}
                </p>
              </div>

              {/* Medium Risk Events */}
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-400">
                    Medium Risk
                  </span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {securityData?.mediumRisk ?? 0}
                </p>
              </div>

              {/* Failed Logins (24h) */}
              <div className="p-4 rounded-lg bg-muted outline">
                <p className="text-sm text-muted-foreground mb-1">
                  Failed Logins (24h)
                </p>
                <p className="text-2xl font-bold">
                  {securityData?.failedLogins24h ?? 0}
                </p>
              </div>

              {/* Blocked Attempts */}
              <div className="p-4 rounded-lg bg-muted outline">
                <p className="text-sm text-muted-foreground mb-1">
                  Blocked Attempts
                </p>
                <p className="text-2xl font-bold">
                  {securityData?.blockedAttempts ?? 0}
                </p>
              </div>

              {/* Office Hours Anomalies */}
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-400">
                    Off-Hours
                  </span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {securityData?.officeHoursAnomalies ?? 0}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Outside 9am-5pm
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Usage & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Client Usage
            </CardTitle>
            <CardDescription>OAuth client activity (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.clients.clients && data.clients.clients.length > 0 ? (
              <div className="space-y-3">
                {data.clients.clients.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.activeTokens} active sessions
                      </p>
                    </div>
                    <Badge variant="outline">{client.logins30d} logins</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No clients registered yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest actions in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length > 0 ? (
              <div className="space-y-4">
                {activity.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {formatAction(item.action)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.userName || item.userEmail || "System"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
