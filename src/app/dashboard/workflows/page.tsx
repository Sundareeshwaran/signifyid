"use client";

/**
 * Workflows List Page
 *
 * Developer-only page for managing client allocation workflows.
 * Shows list of workflows with status, allows create/edit/publish.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitBranch,
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit,
  Loader2,
  Zap,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGate } from "@/components/guards/permission-gate";
import { workflowsApi } from "@/lib/api";
import type { WorkflowListItem, WorkflowStatus } from "@/lib/workflow.types";

// Skeleton loader for workflow cards
function WorkflowCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="h-4 w-60 bg-muted rounded" />
          </div>
          <div className="h-6 w-16 bg-muted rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Status badge component
function StatusBadge({ status }: { status: WorkflowStatus }) {
  const config = {
    draft: { label: "Draft", variant: "secondary" as const, icon: Edit },
    published: {
      label: "Published",
      variant: "default" as const,
      icon: CheckCircle,
    },
    disabled: {
      label: "Disabled",
      variant: "outline" as const,
      icon: AlertCircle,
    },
  }[status];

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: "", description: "" });
  // Delete confirmation state
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load workflows function - declared before useEffect that uses it
  async function loadWorkflows() {
    setIsLoading(true);
    setError(null);
    const result = await workflowsApi.list();
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setWorkflows(result.data.workflows);
    }
    setIsLoading(false);
  }

  // Load workflows on mount
  useEffect(() => {
    void (async () => {
      await loadWorkflows();
    })();
  }, []);

  async function handleCreate() {
    if (!newWorkflow.name.trim()) return;

    setIsCreating(true);
    const result = await workflowsApi.create({
      name: newWorkflow.name.trim(),
      description: newWorkflow.description.trim() || undefined,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setIsCreateOpen(false);
      setNewWorkflow({ name: "", description: "" });
      loadWorkflows();
    }
    setIsCreating(false);
  }

  // Opens the delete confirmation dialog
  function handleDelete(id: string) {
    setDeleteWorkflowId(id);
  }

  // Actually performs the delete after user confirms
  async function confirmDelete() {
    if (!deleteWorkflowId) return;

    setIsDeleting(true);
    const result = await workflowsApi.delete(deleteWorkflowId);
    if (result.error) {
      setError(result.error);
    } else {
      await loadWorkflows();
    }
    setIsDeleting(false);
    setDeleteWorkflowId(null);
  }

  async function handleDuplicate(id: string) {
    const result = await workflowsApi.duplicate(id);
    if (result.error) {
      setError(result.error);
    } else {
      loadWorkflows();
    }
  }

  async function handlePublish(id: string) {
    const result = await workflowsApi.publish(id);
    if (result.error) {
      setError(result.error);
    } else {
      loadWorkflows();
    }
  }

  async function handleDisable(id: string) {
    const result = await workflowsApi.disable(id);
    if (result.error) {
      setError(result.error);
    } else {
      loadWorkflows();
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <PermissionGate
      permission="workflows:manage"
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access workflow management.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">Workflows</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <GitBranch className="h-8 w-8 text-primary" />
              Workflows
            </h1>
            <p className="text-muted-foreground mt-1">
              Visual workflow builder for client allocation and processing
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            {error}
          </div>
        )}

        {/* Workflow grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <WorkflowCardSkeleton key={i} />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-4">
                Create your first workflow to automate client allocation and
                processing logic.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((workflow) => (
              <Card
                key={workflow.id}
                className="group hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {workflow.name}
                      </CardTitle>
                      {workflow.description && (
                        <CardDescription className="line-clamp-2">
                          {workflow.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <StatusBadge status={workflow.status} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/workflows/builder/${workflow.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(workflow.id)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {workflow.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handlePublish(workflow.id)}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {workflow.status === "published" && (
                            <DropdownMenuItem
                              onClick={() => handleDisable(workflow.id)}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Disable
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(workflow.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{workflow.nodeCount} blocks</span>
                    <span>Updated {formatDate(workflow.updatedAt)}</span>
                  </div>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link
                        href={`/dashboard/workflows/builder/${workflow.id}`}
                      >
                        Open Builder
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create workflow dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
              <DialogDescription>
                Give your workflow a name and optional description to get
                started.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Client Onboarding"
                  value={newWorkflow.name}
                  onChange={(e) =>
                    setNewWorkflow({ ...newWorkflow, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this workflow does..."
                  value={newWorkflow.description}
                  onChange={(e) =>
                    setNewWorkflow({
                      ...newWorkflow,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newWorkflow.name.trim() || isCreating}
              >
                {isCreating && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog
          open={deleteWorkflowId !== null}
          onOpenChange={(open) => !open && setDeleteWorkflowId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Workflow</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this workflow? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteWorkflowId(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
