"use client";

/**
 * Workflow Builder Page
 *
 * Visual drag-and-drop workflow editor for creating
 * client allocation and processing workflows.
 */

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Play,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PermissionGate } from "@/components/guards/permission-gate";
import { workflowsApi } from "@/lib/api";

import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { BlockPalette } from "@/components/workflow/block-palette";
import { BlockEditorPanel } from "@/components/workflow/block-editor-panel";
import {
  WorkflowProvider,
  useWorkflow,
} from "@/components/workflow/workflow-context";

// Skeleton loader for the builder
function BuilderSkeleton() {
  return (
    <div className="h-screen flex flex-col animate-pulse">
      {/* Toolbar skeleton */}
      <div className="h-14 border-b px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-muted rounded" />
          <div className="h-5 w-48 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 bg-muted rounded" />
          <div className="h-9 w-20 bg-muted rounded" />
          <div className="h-9 w-24 bg-muted rounded" />
        </div>
      </div>
      {/* Content skeleton */}
      <div className="flex-1 flex">
        <div className="w-64 border-r p-4 space-y-4">
          <div className="h-6 w-32 bg-muted rounded" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
        <div className="flex-1 bg-muted/30" />
      </div>
    </div>
  );
}

// Inner builder component that uses the workflow context
function WorkflowBuilderInner() {
  const router = useRouter();
  const {
    workflow,
    isDirty,
    isSaving,
    isLoading,
    validationResult,
    save,
    validate,
    publish,
    updateGraph,
    selectNode,
    selectedNodeId,
  } = useWorkflow();

  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    duration: number;
    steps: Array<{
      nodeId: string;
      nodeType: string;
      label: string;
      status: string;
      duration?: number;
      output?: unknown;
      error?: string;
    }>;
  } | null>(null);

  const handleSave = useCallback(async () => {
    await save();
  }, [save]);

  const handleValidate = useCallback(async () => {
    await validate();
  }, [validate]);

  const handlePublish = useCallback(async () => {
    const result = await validate();
    if (result && result.valid) {
      await publish();
      router.push("/dashboard/workflows");
    }
    setShowPublishConfirm(false);
  }, [validate, publish, router]);

  const handleExecute = useCallback(async () => {
    if (!workflow) return;
    setIsExecuting(true);
    setExecutionResult(null);

    const result = await workflowsApi.execute(workflow.id);

    if (result.data) {
      setExecutionResult({
        success: result.data.success,
        duration: result.data.duration,
        steps: result.data.steps,
      });
    } else if (result.error) {
      setExecutionResult({
        success: false,
        duration: 0,
        steps: [],
      });
    }
    setIsExecuting(false);
  }, [workflow]);

  if (isLoading) {
    return <BuilderSkeleton />;
  }

  if (!workflow || !workflow.graph) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Workflow not found</h2>
          <Button variant="outline" asChild>
            <Link href="/dashboard/workflows">Back to Workflows</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isReadOnly = workflow.status === "published";

  return (
    <div className="-m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 border-b px-4 flex items-center justify-between bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/workflows">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">{workflow.name}</h1>
            {isDirty && (
              <span className="text-xs text-muted-foreground">
                • Unsaved changes
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Validation status */}
          {validationResult && (
            <div
              className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${
                validationResult.valid
                  ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                  : "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
              }`}
            >
              {validationResult.valid ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Valid
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  {validationResult.errors.length} errors
                </>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={isSaving}
          >
            <Play className="h-4 w-4 mr-1" />
            Validate
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving || isReadOnly}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>

          {workflow.status === "draft" && (
            <Button
              size="sm"
              onClick={() => setShowPublishConfirm(true)}
              disabled={isSaving}
            >
              <Upload className="h-4 w-4 mr-1" />
              Publish
            </Button>
          )}

          {workflow.status === "published" && (
            <Button
              size="sm"
              variant="default"
              onClick={handleExecute}
              disabled={isExecuting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-1" />
              )}
              Execute
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Block palette */}
        {!isReadOnly && <BlockPalette />}

        {/* Canvas */}
        <div className="flex-1 relative">
          <WorkflowCanvas
            nodes={workflow.graph.nodes}
            edges={workflow.graph.edges}
            onNodesChange={(nodes) => updateGraph({ ...workflow.graph, nodes })}
            onEdgesChange={(edges) => updateGraph({ ...workflow.graph, edges })}
            onNodeSelect={selectNode}
            selectedNodeId={selectedNodeId}
            readOnly={isReadOnly}
          />

          {/* Read-only banner */}
          {isReadOnly && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-full text-sm font-medium">
              Published workflow (read-only)
            </div>
          )}
        </div>

        {/* Block editor panel */}
        <BlockEditorPanel
          node={
            selectedNodeId
              ? workflow.graph.nodes.find((n) => n.id === selectedNodeId)
              : undefined
          }
          onUpdate={(updatedNode) => {
            const newNodes = workflow.graph.nodes.map((n) =>
              n.id === updatedNode.id ? updatedNode : n
            );
            updateGraph({ ...workflow.graph, nodes: newNodes });
          }}
          onClose={() => selectNode(null)}
          readOnly={isReadOnly}
        />
      </div>

      {/* Publish confirmation dialog */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-lg font-semibold mb-2">Publish Workflow?</h2>
            <p className="text-muted-foreground mb-4">
              Publishing will make this workflow active and immutable. You
              won&apos;t be able to edit it after publishing. To make changes,
              you&apos;ll need to duplicate it first.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPublishConfirm(false)}
              >
                Cancel
              </Button>
              <Button onClick={handlePublish}>Publish</Button>
            </div>
          </div>
        </div>
      )}

      {/* Execution results dialog */}
      {executionResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {executionResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <h2 className="text-lg font-semibold">
                  {executionResult.success
                    ? "Execution Complete"
                    : "Execution Failed"}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExecutionResult(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Completed in {executionResult.duration}ms •{" "}
              {executionResult.steps.length} steps
            </p>

            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-2">
                {executionResult.steps.map((step, index) => (
                  <div
                    key={step.nodeId}
                    className="p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {index + 1}.
                        </span>
                        <span className="font-medium text-sm">
                          {step.label}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {step.nodeType}
                        </Badge>
                      </div>
                      <Badge
                        variant={
                          step.status === "success" ? "default" : "destructive"
                        }
                        className={
                          step.status === "success" ? "bg-green-500" : ""
                        }
                      >
                        {step.status}
                      </Badge>
                    </div>
                    {step.duration && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Duration: {step.duration}ms
                      </p>
                    )}
                    {step.error && (
                      <p className="text-xs text-red-500 mt-1">{step.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end mt-4">
              <Button onClick={() => setExecutionResult(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main page component with provider
export default function WorkflowBuilderPage() {
  const params = useParams();
  const workflowId = params.id as string;

  return (
    <PermissionGate
      permission="workflows:manage"
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don&apos;t have permission to access workflow builder.
            </p>
          </div>
        </div>
      }
    >
      <WorkflowProvider workflowId={workflowId}>
        <WorkflowBuilderInner />
      </WorkflowProvider>
    </PermissionGate>
  );
}
