"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Monitor, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { sessionsApi, authApi } from "@/lib/api";
import { SessionsTable, Session } from "@/components/tables/sessions-table";
import { Loader2, LogOut } from "lucide-react";

export default function SessionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchCurrentUser();
    fetchSessions();
  }, [currentPage, pageSize]);

  const fetchCurrentUser = async () => {
    const result = await authApi.me();
    if (result.data) {
      setCurrentUserId(result.data.id);
      setCurrentUserRoles(result.data.roles || []);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    setError("");
    const result = await sessionsApi.getMe({
      page: currentPage,
      limit: pageSize,
    });

    if (result.data) {
      setSessions(result.data.sessions);
      setTotalSessions(result.data.pagination.total);
      setTotalPages(result.data.pagination.pages);
    } else if (result.error) {
      if (
        result.error.includes("401") ||
        result.error.includes("Unauthorized")
      ) {
        router.push("/login");
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    const result = await sessionsApi.revoke(sessionId);

    if (result.error) {
      setError(result.error);
    } else {
      // Remove from list
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }
    setRevoking(null);
  };

  const handleLogoutAll = async () => {
    setLogoutAllLoading(true);
    const result = await sessionsApi.logoutAll();

    if (result.error) {
      setError(result.error);
      setLogoutAllLoading(false);
    } else {
      // Redirect to login after logging out all sessions
      router.push("/login");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {currentUserRoles.includes("super_admin")
              ? "Organization Sessions"
              : "My Active Sessions"}
          </h1>
          <p className="text-muted-foreground">
            {currentUserRoles.includes("super_admin")
              ? "View and manage all active sessions in your organization."
              : "View and manage your active login sessions across devices."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSessions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Logout all sessions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will revoke all active sessions including your current
                  one. You will need to log in again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogoutAll}
                  disabled={logoutAllLoading}
                >
                  {logoutAllLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Logout All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Sessions</CardTitle>
                <CardDescription>
                  {totalSessions} total session{totalSessions !== 1 ? "s" : ""}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Items per page:
              </span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <SessionsTable
                sessions={sessions}
                currentUserId={currentUserId}
                revokingId={revoking}
                onRevoke={handleRevoke}
              />

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                    {Math.min(currentPage * pageSize, totalSessions)} of{" "}
                    {totalSessions} sessions
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Show first page, last page, current page, and pages around current
                          return (
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1
                          );
                        })
                        .map((page, idx, arr) => {
                          // Add ellipsis if there's a gap
                          const prevPage = arr[idx - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;

                          return (
                            <div key={page} className="flex items-center">
                              {showEllipsis && (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              )}
                              <PaginationItem>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            </div>
                          );
                        })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalPages, currentPage + 1)
                            )
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
