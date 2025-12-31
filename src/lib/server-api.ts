/**
 * Server-Side API Helpers
 *
 * These functions fetch data on the server using cookies from the request headers.
 * Used by Server Components to pre-fetch data before rendering.
 */

import { cookies } from "next/headers";
import type { WorkflowListItem } from "./workflow.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Make a server-side API request with cookie forwarding
 */
async function serverFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      cache: "no-store", // Always fetch fresh data
    });

    if (!response.ok) {
      console.error(`Server fetch failed: ${response.status}`);
      return null;
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    // DYNAMIC_SERVER_USAGE is expected during static build when using cookies()
    // This signals Next.js to render the route dynamically - not an actual error
    const isDynamicError =
      error instanceof Error && error.message?.includes("Dynamic server usage");
    if (!isDynamicError) {
      console.error("Server fetch error:", error);
    }
    return null;
  }
}

// Dashboard data types
export interface DashboardStats {
  organization: {
    name: string;
    domain: string;
    plan: string;
    createdAt: string;
  };
  users: {
    total: number;
    active: number;
    newThisWeek: number;
  };
  clients: {
    total: number;
  };
  sessions: {
    active: number;
    uniqueUsers: number;
  };
  activity: {
    totalLogs: number;
    logsToday: number;
    logsThisWeek: number;
  };
  security: {
    highRiskEvents: number;
    mediumRiskEvents: number;
    blockedAttempts: number;
    trustedDevices: number;
  };
}

export interface ActivityItem {
  id: string;
  action: string;
  meta: Record<string, unknown>;
  createdAt: string;
  userEmail: string;
  userName: string | null;
}

/**
 * Fetch dashboard stats on the server
 */
export async function fetchDashboardStats(): Promise<DashboardStats | null> {
  return serverFetch<DashboardStats>("/dashboard/stats");
}

/**
 * Fetch dashboard activity on the server
 */
export async function fetchDashboardActivity(
  limit: number = 10
): Promise<{ activity: ActivityItem[] } | null> {
  return serverFetch<{ activity: ActivityItem[] }>(
    `/dashboard/activity?limit=${limit}`
  );
}

/**
 * Fetch workflows on the server
 */
export async function fetchWorkflows(): Promise<{
  workflows: WorkflowListItem[];
} | null> {
  return serverFetch<{ workflows: WorkflowListItem[] }>("/workflows");
}

/**
 * Fetch all dashboard data in parallel
 */
export async function fetchAllDashboardData() {
  const [stats, activityData, workflowsData] = await Promise.all([
    fetchDashboardStats(),
    fetchDashboardActivity(10),
    fetchWorkflows(),
  ]);

  return {
    stats,
    activity: activityData?.activity ?? [],
    workflows: workflowsData?.workflows ?? [],
  };
}
