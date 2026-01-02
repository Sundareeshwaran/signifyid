"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  Calendar,
  Eye,
  X,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface AuditLog {
  id: string;
  action: string;
  meta: any;
  createdAt: string;
  userEmail: string | null;
  userName: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const actionLabels: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  "auth.login": { label: "Login", variant: "default" },
  "auth.logout": { label: "Logout", variant: "secondary" },
  "auth.login_failed": { label: "Login Failed", variant: "destructive" },
  "auth.login_mfa_required": { label: "MFA Required", variant: "outline" },
  "mfa.enabled": { label: "MFA Enabled", variant: "default" },
  "mfa.disabled": { label: "MFA Disabled", variant: "destructive" },
  "mfa.enroll_started": { label: "MFA Enrollment", variant: "outline" },
  "user.created": { label: "User Created", variant: "default" },
  "user.updated": { label: "User Updated", variant: "secondary" },
  "user.disabled": { label: "User Disabled", variant: "destructive" },
  "client.created": { label: "Client Created", variant: "default" },
  "client.deleted": { label: "Client Deleted", variant: "destructive" },
  "oauth.authorize": { label: "OAuth Authorize", variant: "outline" },
  "oauth.token_issued": { label: "Token Issued", variant: "default" },
};

/**
 * Audit Logs Page
 *
 * View organization audit logs with pagination
 */
export default function LogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
  });
  const [pageSize, setPageSize] = useState(25);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs(1, pageSize);
  }, []);

  const fetchLogs = async (page: number, limit: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/logs?page=${page}&limit=${limit}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (response.ok) {
        setLogs(data.logs);
        setPagination(data.pagination);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        setError(data.error || "Failed to load logs");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    fetchLogs(page, pageSize);
  };

  const handlePageSizeChange = (newSize: string) => {
    const size = parseInt(newSize);
    setPageSize(size);
    fetchLogs(1, size); // Reset to page 1 when changing page size
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getActionInfo = (action: string) => {
    return (
      actionLabels[action] || { label: action, variant: "outline" as const }
    );
  };

  // Generate page numbers with smart truncation
  const getPageNumbers = () => {
    const { page, pages } = pagination;
    const pageNumbers: (number | "ellipsis")[] = [];

    if (pages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      if (page > 3) {
        pageNumbers.push("ellipsis");
      }

      // Show pages around current page
      const start = Math.max(2, page - 1);
      const end = Math.min(pages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }

      if (page < pages - 2) {
        pageNumbers.push("ellipsis");
      }

      // Always show last page
      if (pages > 1) {
        pageNumbers.push(pages);
      }
    }

    return pageNumbers;
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const startRecord = (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">View organization activity logs</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Activity Log</CardTitle>
                <CardDescription>
                  {pagination.total} total events
                </CardDescription>
              </div>
            </div>

            {/* Page Size Selector & Refresh Button */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchLogs(pagination.page, pageSize)}
                disabled={loading}
                title="Refresh logs"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
              <span className="text-sm text-muted-foreground">Show</span>
              <Select
                value={pageSize.toString()}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const actionInfo = getActionInfo(log.action);
                    return (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell>
                          <Badge variant={actionInfo.variant}>
                            {actionInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.userEmail ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{log.userEmail}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              System
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.meta && Object.keys(log.meta).length > 0 ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {JSON.stringify(log.meta).slice(0, 50)}
                              {JSON.stringify(log.meta).length > 50 && "..."}
                            </code>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {formatDate(log.createdAt)}
                              </span>
                            </div>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Enhanced Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                {/* Record count info */}
                <div className="text-sm text-muted-foreground">
                  Showing {startRecord} to {endRecord} of {pagination.total}{" "}
                  entries
                </div>

                {/* Page navigation */}
                {pagination.pages > 1 && (
                  <div className="flex items-center gap-1">
                    {/* First page */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.page === 1 || loading}
                      title="First page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>

                    {/* Previous page */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1 || loading}
                      title="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1 mx-1">
                      {getPageNumbers().map((pageNum, idx) =>
                        pageNum === "ellipsis" ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className="px-2 text-muted-foreground"
                          >
                            ...
                          </span>
                        ) : (
                          <Button
                            key={pageNum}
                            variant={
                              pagination.page === pageNum
                                ? "default"
                                : "outline"
                            }
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading}
                          >
                            {pageNum}
                          </Button>
                        )
                      )}
                    </div>

                    {/* Next page */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages || loading}
                      title="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* Last page */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(pagination.pages)}
                      disabled={pagination.page === pagination.pages || loading}
                      title="Last page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span>Audit Log Details</span>
                {selectedLog && (
                  <Badge
                    variant={getActionInfo(selectedLog.action).variant}
                    className="ml-3"
                  >
                    {getActionInfo(selectedLog.action).label}
                  </Badge>
                )}
              </div>
            </DialogTitle>
            <DialogDescription>
              Full details of the selected audit log entry
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Event ID
                  </label>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {selectedLog.id}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Action
                  </label>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {selectedLog.action}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    User
                  </label>
                  <div className="flex items-center gap-2 bg-muted px-2 py-1 rounded">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedLog.userEmail || "System"}
                    </span>
                  </div>
                  {selectedLog.userName && (
                    <p className="text-xs text-muted-foreground">
                      {selectedLog.userName}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Timestamp
                  </label>
                  <div className="flex items-center gap-2 bg-muted px-2 py-1 rounded">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {formatDate(selectedLog.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Metadata
                </label>
                {selectedLog.meta &&
                Object.keys(selectedLog.meta).length > 0 ? (
                  <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedLog.meta, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded">
                    No additional metadata
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
