"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserPlus,
  Download,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UsersTable, UserData } from "@/components/tables/users-table";
import { InviteUserDialog } from "@/components/dialogs/invite-user-dialog";
import { CreateUserDialog } from "@/components/dialogs/create-user-dialog";
import { EditUserDialog } from "@/components/dialogs/edit-user-dialog";
import { UserDetailsDialog } from "@/components/dialogs/user-details-dialog";
import { DisableUserDialog } from "@/components/dialogs/disable-user-dialog";
import { DeleteUserDialog } from "@/components/dialogs/delete-user-dialog";
import { ExportDataDialog } from "@/components/dialogs/export-data-dialog";
import { usersApi, authApi, rolesApi, exportApi } from "@/lib/api";
import { Role, hasPermission, getPrimaryRole } from "@/lib/rbac";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

/**
 * Users Management Page
 *
 * Lists all users with RBAC-controlled actions, pagination, and filters
 */
export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>("user");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<{
    id: string;
    email: string;
    displayName: string | null;
    status: string;
    roles: string[];
    mfaEnabled: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    activeSessionsCount?: number;
  } | null>(null);

  // Available roles for filter
  const [availableRoles, setAvailableRoles] = useState<
    { id: string; name: string; description?: string | null }[]
  >([]);

  // Fetch current user to get role
  useEffect(() => {
    async function fetchCurrentUser() {
      const result = await authApi.me();
      if (result.data) {
        const roles = result.data.roles || [];
        setCurrentRole(getPrimaryRole(roles));
      }
    }
    fetchCurrentUser();
  }, []);

  // Fetch available roles for filter
  useEffect(() => {
    async function fetchRoles() {
      const result = await rolesApi.list();
      if (result.data) {
        setAvailableRoles(result.data.roles);
      }
    }
    fetchRoles();
  }, []);

  // Fetch users with filters
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await usersApi.list({
      page: currentPage,
      limit: pageSize,
      status: statusFilter || undefined,
      role: roleFilter || undefined,
      search: searchQuery || undefined,
    });

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setUsers(result.data.users);
      setTotalUsers(result.data.pagination.total);
      setTotalPages(result.data.pagination.pages);
    }

    setLoading(false);
  }, [currentPage, pageSize, statusFilter, roleFilter, searchQuery]);

  useEffect(() => {
    void (async () => {
      await fetchUsers();
    })();
  }, [fetchUsers]);

  // Helper functions to reset page when filters change
  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val === "all" ? "" : val);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (val: string) => {
    setRoleFilter(val === "all" ? "" : val);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(parseInt(val));
    setCurrentPage(1);
  };

  const canInviteUsers = hasPermission(currentRole, "users:invite");
  const canManageMfa = hasPermission(currentRole, "users:update");
  const canExport = hasPermission(currentRole, "data:export");
  const isSuperAdmin = currentRole === "super_admin";

  // Handle actions
  const handleViewDetails = async (user: UserData) => {
    // Fetch detailed user info with active sessions count
    const result = await usersApi.get(user.id);
    if (result.data) {
      setSelectedUserDetails(result.data);
      setDetailsDialogOpen(true);
    }
  };

  const handleEdit = (user: UserData) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDisable = (user: UserData) => {
    setSelectedUser(user);
    setDisableDialogOpen(true);
  };

  const handleDelete = (user: UserData) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleEnable = async (user: UserData) => {
    const result = await usersApi.enable(user.id);
    if (!result.error) {
      fetchUsers();
    }
  };

  const handleSuccess = () => {
    fetchUsers();
  };

  // Export handler with file download
  const handleExportConfirm = async (format: "csv" | "json") => {
    try {
      const { blob, filename } = await exportApi.users(format, {
        ...(statusFilter && { status: statusFilter }),
        ...(roleFilter && { role: roleFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      throw err; // Re-throw to let dialog handle error display
    }
  };

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalUsers);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and access permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          )}
          {canInviteUsers && (
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
              onClick={() => setInviteDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          )}
        </div>
      </div>

      {/* Users Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  {loading
                    ? "Loading..."
                    : `${totalUsers} user${
                        totalUsers !== 1 ? "s" : ""
                      } in your organization`}
                </CardDescription>
              </div>

              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="w-[70px]">
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

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter || "all"}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                </SelectContent>
              </Select>

              {/* Role Filter */}
              <Select
                value={roleFilter || "all"}
                onValueChange={handleRoleFilterChange}
              >
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.name} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No users found
            </div>
          ) : (
            <>
              <UsersTable
                users={users}
                currentUserRole={currentRole}
                availableRoles={availableRoles}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onDisable={handleDisable}
                onEnable={handleEnable}
                onDelete={handleDelete}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {startRecord} to {endRecord} of {totalUsers} users
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={handleSuccess}
      />

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleSuccess}
      />

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSuccess={handleSuccess}
        canManageMfa={canManageMfa}
      />

      <UserDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        user={selectedUserDetails}
      />

      <DisableUserDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        user={selectedUser}
        onSuccess={handleSuccess}
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
        onSuccess={handleSuccess}
      />

      <ExportDataDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        resource="users"
        rowCount={totalUsers}
        filters={{
          status: statusFilter,
          role: roleFilter,
          search: searchQuery,
        }}
        onConfirm={handleExportConfirm}
      />
    </div>
  );
}
