/**
 * Workflow Executor Service
 *
 * Executes published workflows by traversing the graph and
 * performing real actions at each node.
 */

import * as WorkflowModel from "../models/Workflow.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";

// Execution context passed through the workflow
export interface ExecutionContext {
  orgId: string;
  userId: string;
  workflowId: string;
  variables: Record<string, unknown>;
}

// Result of a single step execution
export interface StepResult {
  nodeId: string;
  nodeType: WorkflowModel.WorkflowNodeType;
  label: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  duration?: number;
  output?: unknown;
  error?: string;
  path?: "true" | "false";
}

// Overall execution result
export interface ExecutionResult {
  success: boolean;
  workflowId: string;
  startedAt: Date;
  completedAt: Date;
  steps: StepResult[];
  error?: string;
}

// Action handler function type
type ActionHandler = (
  node: WorkflowModel.WorkflowNode,
  context: ExecutionContext
) => Promise<{ success: boolean; output?: unknown; error?: string }>;

// Action handlers registry
const actionHandlers: Record<WorkflowModel.ActionType, ActionHandler> = {
  allocate_client: handleAllocateClient,
  create_task: handleCreateTask,
  assign_role: handleAssignRole,
  enable_feature: handleEnableFeature,
  disable_feature: handleDisableFeature,
  notify_developer: handleNotifyDeveloper,
  send_email: handleSendEmail,
  webhook: handleWebhook,
  delay: handleDelay,
};

/**
 * Execute a published workflow
 */
export async function executeWorkflow(
  workflowId: string,
  orgId: string,
  userId: string,
  initialContext: Record<string, unknown> = {}
): Promise<ExecutionResult> {
  const startedAt = new Date();
  const steps: StepResult[] = [];

  // Load workflow
  const workflow = await WorkflowModel.findById(workflowId, orgId);
  if (!workflow) {
    return {
      success: false,
      workflowId,
      startedAt,
      completedAt: new Date(),
      steps: [],
      error: "Workflow not found",
    };
  }

  // Only published workflows can be executed
  if (workflow.status !== "published") {
    return {
      success: false,
      workflowId,
      startedAt,
      completedAt: new Date(),
      steps: [],
      error: "Only published workflows can be executed",
    };
  }

  const context: ExecutionContext = {
    orgId,
    userId,
    workflowId,
    variables: { ...initialContext },
  };

  const { nodes, edges } = workflow.graph_json;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Find trigger node
  const triggerNode = nodes.find((n) => n.type === "trigger");
  if (!triggerNode) {
    return {
      success: false,
      workflowId,
      startedAt,
      completedAt: new Date(),
      steps: [],
      error: "Workflow has no trigger node",
    };
  }

  const visited = new Set<string>();
  let hasError = false;

  // Traverse and execute workflow
  async function executeNode(
    nodeId: string,
    path?: "true" | "false"
  ): Promise<void> {
    if (visited.has(nodeId) || hasError) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    const stepStart = Date.now();
    const step: StepResult = {
      nodeId: node.id,
      nodeType: node.type,
      label: node.data.label || node.type,
      status: "running",
      path,
    };

    steps.push(step);

    try {
      if (node.type === "trigger") {
        // Trigger just passes through
        step.status = "success";
        step.output = { triggered: true };
      } else if (node.type === "end") {
        // End node - workflow complete
        step.status = "success";
        step.output = {
          status: (node.data as WorkflowModel.EndNodeData).status || "success",
        };
        return; // Don't continue past end node
      } else if (node.type === "action") {
        // Execute action
        const actionData = node.data as WorkflowModel.ActionNodeData;
        const handler = actionHandlers[actionData.actionType];

        if (handler) {
          const result = await handler(node, context);
          step.status = result.success ? "success" : "failed";
          step.output = result.output;
          step.error = result.error;

          if (!result.success) {
            hasError = true;
            return;
          }
        } else {
          step.status = "failed";
          step.error = `Unknown action type: ${actionData.actionType}`;
          hasError = true;
          return;
        }
      } else if (node.type === "condition") {
        // Evaluate condition
        const conditionData = node.data as WorkflowModel.ConditionNodeData;
        const result = evaluateCondition(conditionData, context.variables);
        step.status = "success";
        step.output = { condition: result };

        // Find the correct path edge
        const outgoingEdges = edges.filter((e) => e.source === nodeId);
        const nextEdge = outgoingEdges.find(
          (e) => e.sourceHandle === (result ? "true" : "false")
        );

        if (nextEdge) {
          step.duration = Date.now() - stepStart;
          await executeNode(nextEdge.target, result ? "true" : "false");
        }
        return;
      }

      step.duration = Date.now() - stepStart;

      // Follow outgoing edges for non-condition nodes
      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        await executeNode(edge.target);
      }
    } catch (error) {
      step.status = "failed";
      step.error = error instanceof Error ? error.message : "Unknown error";
      step.duration = Date.now() - stepStart;
      hasError = true;
    }
  }

  await executeNode(triggerNode.id);

  const completedAt = new Date();

  // Log execution to audit
  await AuditLogModel.create(orgId, userId, "workflow.executed", {
    workflowId,
    workflowName: workflow.name,
    success: !hasError,
    stepsExecuted: steps.length,
    duration: completedAt.getTime() - startedAt.getTime(),
  });

  return {
    success: !hasError,
    workflowId,
    startedAt,
    completedAt,
    steps,
  };
}

// Condition evaluator
function evaluateCondition(
  data: WorkflowModel.ConditionNodeData,
  variables: Record<string, unknown>
): boolean {
  const fieldValue = variables[data.field];
  const compareValue = data.value;

  switch (data.operator) {
    case "equals":
      return fieldValue === compareValue;
    case "not_equals":
      return fieldValue !== compareValue;
    case "contains":
      return String(fieldValue).includes(String(compareValue));
    case "greater_than":
      return Number(fieldValue) > Number(compareValue);
    case "less_than":
      return Number(fieldValue) < Number(compareValue);
    case "is_empty":
      return !fieldValue || fieldValue === "";
    case "is_not_empty":
      return !!fieldValue && fieldValue !== "";
    default:
      return true;
  }
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handleAllocateClient(
  node: WorkflowModel.WorkflowNode,
  context: ExecutionContext
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  // Stub - would integrate with client allocation service
  const config = (node.data as WorkflowModel.ActionNodeData).config || {};
  console.log(`[Workflow ${context.workflowId}] Allocate client:`, config);

  return {
    success: true,
    output: {
      action: "allocate_client",
      config,
      note: "Stub - no actual allocation performed",
    },
  };
}

async function handleCreateTask(
  node: WorkflowModel.WorkflowNode,
  context: ExecutionContext
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  // Stub - would create a task in task management
  const config = (node.data as WorkflowModel.ActionNodeData).config || {};
  console.log(`[Workflow ${context.workflowId}] Create task:`, config);

  return {
    success: true,
    output: {
      action: "create_task",
      config,
      note: "Stub - no actual task created",
    },
  };
}

async function handleAssignRole(
  node: WorkflowModel.WorkflowNode,
  context: ExecutionContext
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  // Stub - would assign role to user
  const config = (node.data as WorkflowModel.ActionNodeData).config || {};
  console.log(`[Workflow ${context.workflowId}] Assign role:`, config);

  return {
    success: true,
    output: {
      action: "assign_role",
      config,
      note: "Stub - no actual role assigned",
    },
  };
}

async function handleEnableFeature(
  node: WorkflowModel.WorkflowNode,
  context: ExecutionContext
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  // Stub - would enable feature flag
  const config = (node.data as WorkflowModel.ActionNodeData).config || {};
  console.log(`[Workflow ${context.workflowId}] Enable feature:`, config);

  return {
    success: true,
    output: {
      action: "enable_feature",
      config,
      note: "Stub - no actual feature enabled",
    },
  };
}

async function handleDisableFeature(
  node: WorkflowModel.WorkflowNode,
  context: ExecutionContext
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  // Stub - would disable feature flag
  const config = (node.data as WorkflowModel.ActionNodeData).config || {};
  console.log(`[Workflow ${context.workflowId}] Disable feature:`, config);

  return {
    success: true,
    output: {
      action: "disable_feature",
      config,
      note: "Stub - no actual feature disabled",
    },
  };
}

async function handleNotifyDeveloper(
  node: WorkflowModel.WorkflowNode,
  context: ExecutionContext
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  // Creates an audit log notification
  const config = (node.data as WorkflowModel.ActionNodeData).config || {};

  await AuditLogModel.create(
    context.orgId,
    context.userId,
    "workflow.notification",
    {
      workflowId: context.workflowId,
      message:
        (config as { message?: string }).message || "Workflow notification",
      nodeId: node.id,
    }
  );

  console.log(`[Workflow ${context.workflowId}] Developer notified`);

  return {
    success: true,
    output: { action: "notify_developer", notified: true },
  };
}

async function handleSendEmail(
  node: WorkflowModel.WorkflowNode,
  context: ExecutionContext
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  // Stub - would send email via email service
  const config = (node.data as WorkflowModel.ActionNodeData).config || {};
  console.log(`[Workflow ${context.workflowId}] Send email:`, config);

  return {
    success: true,
    output: {
      action: "send_email",
      config,
      note: "Stub - no actual email sent",
    },
  };
}

async function handleWebhook(
  node: WorkflowModel.WorkflowNode,
  context: ExecutionContext
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  // Actually call webhook URL
  const config =
    ((node.data as WorkflowModel.ActionNodeData).config as {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
    }) || {};

  const url = config.url;
  if (!url) {
    return { success: false, error: "Webhook URL not configured" };
  }

  try {
    const response = await fetch(url, {
      method: config.method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      body: JSON.stringify({
        workflowId: context.workflowId,
        orgId: context.orgId,
        nodeId: node.id,
        variables: context.variables,
        payload: config.body,
        timestamp: new Date().toISOString(),
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return {
        success: false,
        error: `Webhook returned ${response.status}: ${responseText}`,
      };
    }

    console.log(`[Workflow ${context.workflowId}] Webhook called: ${url}`);

    return {
      success: true,
      output: {
        action: "webhook",
        url,
        status: response.status,
        response: responseText.substring(0, 500), // Limit response size
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Webhook failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

async function handleDelay(
  node: WorkflowModel.WorkflowNode,
  context: ExecutionContext
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  const config =
    ((node.data as WorkflowModel.ActionNodeData).config as {
      duration?: number; // milliseconds
    }) || {};

  const duration = config.duration || 1000; // Default 1 second
  const maxDelay = 30000; // Max 30 seconds
  const actualDelay = Math.min(duration, maxDelay);

  console.log(`[Workflow ${context.workflowId}] Delaying ${actualDelay}ms`);

  await new Promise((resolve) => setTimeout(resolve, actualDelay));

  return {
    success: true,
    output: { action: "delay", delayMs: actualDelay },
  };
}
