"use client";

import { useState, useEffect } from "react";
import { Shield, Plus, Loader2, Check, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { rolesApi } from "@/lib/api";
import { usePermissions } from "@/components/providers/permission-context";
import { PermissionGate } from "@/components/guards/permission-gate";

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: string;
}

/**
 * Roles & Permissions Page
 *
 * Displays role definitions and permission matrix with CRUD functionality
 */
export default function RolesPage() {
  const { can } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Create role form state
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Fetch roles and permissions
  useEffect(() => {
    async function fetchData() {
      const [rolesResult, permsResult] = await Promise.all([
        rolesApi.list(),
        rolesApi.getPermissions(),
      ]);

      if (rolesResult.data) {
        setRoles(rolesResult.data.roles);
      }
      if (permsResult.data) {
        setAvailablePermissions(permsResult.data.permissions);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || selectedPermissions.length === 0) return;

    setCreating(true);
    const result = await rolesApi.create({
      name: newRoleName.trim().toLowerCase().replace(/\s+/g, "_"),
      permissions: selectedPermissions,
      description: newRoleDescription.trim() || undefined,
    });

    if (result.data) {
      // Refresh roles list
      const rolesResult = await rolesApi.list();
      if (rolesResult.data) {
        setRoles(rolesResult.data.roles);
      }
      setIsCreateDialogOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      setSelectedPermissions([]);
    }
    setCreating(false);
  };

  const handleDeleteRole = async (roleId: string) => {
    const result = await rolesApi.delete(roleId);
    if (!result.error) {
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    }
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  // Group permissions by resource
  const groupedPermissions = availablePermissions.reduce((acc, perm) => {
    const [resource] = perm.split(":");
    if (!acc[resource]) acc[resource] = [];
    acc[resource].push(perm);
    return acc;
  }, {} as Record<string, string[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const systemRoles = roles.filter((r) => r.isSystemRole);
  const customRoles = roles.filter((r) => !r.isSystemRole);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            Manage role definitions and permission assignments
          </p>
        </div>

        <PermissionGate permission="roles:manage">
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Custom Role</DialogTitle>
                <DialogDescription>
                  Define a new role with specific permissions for your
                  organization.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., read_only_analyst"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this role is for..."
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="border rounded-lg p-4 space-y-4">
                    {Object.entries(groupedPermissions).map(
                      ([resource, perms]) => (
                        <div key={resource}>
                          <h4 className="text-sm font-medium capitalize mb-2">
                            {resource}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {perms.map((perm) => (
                              <label
                                key={perm}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedPermissions.includes(perm)}
                                  onCheckedChange={() => togglePermission(perm)}
                                />
                                <span className="text-sm">{perm}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPermissions.length} permission(s) selected
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRole}
                  disabled={
                    creating ||
                    !newRoleName.trim() ||
                    selectedPermissions.length === 0
                  }
                >
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PermissionGate>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemRoles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custom Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customRoles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {availablePermissions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p className="font-medium text-sm">
            Role-Based Access Control (RBAC)
          </p>
          <p className="text-sm text-muted-foreground">
            System roles cannot be modified or deleted. Create custom roles to
            define specific permission sets for your organization.
          </p>
        </div>
      </div>

      {/* System Roles */}
      <Card>
        <CardHeader>
          <CardTitle>System Roles</CardTitle>
          <CardDescription>
            Default roles provided by the platform. These cannot be modified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemRoles.map((role) => (
              <div
                key={role.id}
                className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  setSelectedRole(role);
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold capitalize">
                    {role.name.replace(/_/g, " ")}
                  </h3>
                  <Badge variant="secondary">System</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {role.description || "No description"}
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.includes("*") ? (
                    <Badge variant="outline" className="text-xs">
                      All Permissions
                    </Badge>
                  ) : (
                    <>
                      {role.permissions.slice(0, 3).map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                      {role.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 3} more
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Roles */}
      {customRoles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Roles</CardTitle>
            <CardDescription>
              Roles created for your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customRoles.map((role) => (
                <div
                  key={role.id}
                  className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedRole(role)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold capitalize">
                      {role.name.replace(/_/g, " ")}
                    </h3>
                    <PermissionGate permission="roles:manage">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </PermissionGate>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {role.description || "No description"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 3).map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                    {role.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Details Dialog */}
      <Dialog
        open={!!selectedRole}
        onOpenChange={(open) => !open && setSelectedRole(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {selectedRole?.name.replace(/_/g, " ")}
              {selectedRole?.isSystemRole && (
                <Badge variant="secondary" className="ml-2">
                  System
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRole?.description || "No description provided"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">
                  Permissions ({selectedRole?.permissions.length || 0})
                </h4>
                {selectedRole?.permissions.includes("*") ? (
                  <div className="border rounded-lg p-4 bg-primary/5">
                    <Badge variant="outline" className="text-sm">
                      <Check className="mr-2 h-3 w-3" />
                      All Permissions
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      This role has access to all permissions in the system.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 space-y-3">
                    {(() => {
                      // Group permissions by resource for better display
                      const grouped =
                        selectedRole?.permissions.reduce((acc, perm) => {
                          const [resource] = perm.split(":");
                          if (!acc[resource]) acc[resource] = [];
                          acc[resource].push(perm);
                          return acc;
                        }, {} as Record<string, string[]>) || {};

                      return Object.entries(grouped).map(
                        ([resource, perms]) => (
                          <div key={resource}>
                            <h5 className="text-sm font-medium capitalize mb-2 text-primary">
                              {resource}
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {perms.map((perm) => (
                                <Badge
                                  key={perm}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  {perm}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Role Type</p>
                  <p className="text-sm font-medium">
                    {selectedRole?.isSystemRole ? "System Role" : "Custom Role"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">
                    {selectedRole?.createdAt
                      ? new Date(selectedRole.createdAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRole(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
