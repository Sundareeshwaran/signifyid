"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { dashboardApi, workflowsApi } from "@/lib/api";
import type { DashboardStats, ActivityItem } from "@/lib/server-api";
import type { WorkflowListItem } from "@/lib/workflow.types";

/**
 * Dashboard Page
 *
 * Main dashboard overview showing stats, activity, and quick insights.
 * Uses client-side data fetching since it needs auth context.
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      const [statsResult, activityResult, workflowsResult] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getActivity(10),
        workflowsApi.list(),
      ]);

      if (statsResult.data) {
        setStats(statsResult.data);
      }

      if (activityResult.data?.activity) {
        setActivity(activityResult.data.activity);
      }

      if (workflowsResult.data?.workflows) {
        setWorkflows(workflowsResult.data.workflows);
      }

      setLoading(false);
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardContent
      initialStats={stats}
      initialActivity={activity}
      initialWorkflows={workflows}
    />
  );
}
