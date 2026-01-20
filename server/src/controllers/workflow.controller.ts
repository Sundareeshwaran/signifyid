/**
 * Workflow Controller
 *
 * Handles workflow management business logic including
 * CRUD operations, publishing, validation, and simulation.
 */
import type { Request, Response } from "express";
import * as WorkflowModel from "../models/Workflow.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import * as WorkflowExecutor from "../services/workflow-executor.service.js";
import { logger } from "../config/logger.js";

/**
 * List all workflows in organization
 */
export async function list(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const status = req.query.status as WorkflowModel.WorkflowStatus | undefined;
    const workflows = await WorkflowModel.list(orgId, { status });

    return res.json({
      workflows: workflows.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        status: w.status,
        nodeCount: w.graph_json?.nodes?.length || 0,
        createdBy: w.created_by,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
        publishedAt: w.published_at,
      })),
    });
  } catch (error) {
    logger.error("Error listing workflows", { error });
    return res.status(500).json({ error: "Failed to list workflows" });
  }
}

/**
 * Get workflow by ID
 */
export async function getById(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    const { id } = req.params;

    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const workflow = await WorkflowModel.findById(id, orgId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    return res.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        graph: workflow.graph_json,
        createdBy: workflow.created_by,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
        publishedAt: workflow.published_at,
      },
    });
  } catch (error) {
    logger.error("Error getting workflow", { error });
    return res.status(500).json({ error: "Failed to get workflow" });
  }
}

/**
 * Create a new workflow
 */
export async function create(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;
    const { name, description } = req.body;

    if (!orgId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }

    const workflow = await WorkflowModel.create(
      orgId,
      userId,
      name.trim(),
      description?.trim()
    );

    // Log audit
    await AuditLogModel.create(orgId, userId, "workflow.created", {
      workflowId: workflow.id,
      name: workflow.name,
    });

    return res.status(201).json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        graph: workflow.graph_json,
        createdAt: workflow.created_at,
      },
    });
  } catch (error) {
    logger.error("Error creating workflow", { error });
    return res.status(500).json({ error: "Failed to create workflow" });
  }
}

/**
 * Update workflow
 */
export async function update(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;
    const { id } = req.params;
    const { name, description, graph } = req.body;

    if (!orgId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if workflow exists
    const existing = await WorkflowModel.findById(id, orgId);
    if (!existing) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    // Cannot update published workflows
    if (existing.status === "published") {
      return res.status(400).json({
        error: "Cannot modify published workflow. Duplicate it first.",
      });
    }

    const updateData: {
      name?: string;
      description?: string;
      graph_json?: WorkflowModel.WorkflowGraph;
    } = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    if (graph !== undefined) {
      updateData.graph_json = graph;
    }

    const workflow = await WorkflowModel.update(id, orgId, updateData);

    if (!workflow) {
      return res.status(404).json({ error: "Failed to update workflow" });
    }

    // Log audit
    await AuditLogModel.create(orgId, userId, "workflow.updated", {
      workflowId: workflow.id,
      changes: Object.keys(updateData),
    });

    return res.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        graph: workflow.graph_json,
        updatedAt: workflow.updated_at,
      },
    });
  } catch (error) {
    logger.error("Error updating workflow", { error });
    return res.status(500).json({ error: "Failed to update workflow" });
  }
}

/**
 * Delete workflow
 */
export async function remove(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;
    const { id } = req.params;

    if (!orgId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existing = await WorkflowModel.findById(id, orgId);
    if (!existing) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const deleted = await WorkflowModel.remove(id, orgId);
    if (!deleted) {
      return res.status(500).json({ error: "Failed to delete workflow" });
    }

    // Log audit
    await AuditLogModel.create(orgId, userId, "workflow.deleted", {
      workflowId: id,
      name: existing.name,
    });

    return res.json({ message: "Workflow deleted" });
  } catch (error) {
    logger.error("Error deleting workflow", { error });
    return res.status(500).json({ error: "Failed to delete workflow" });
  }
}

/**
 * Publish workflow
 */
export async function publish(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;
    const { id } = req.params;

    if (!orgId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existing = await WorkflowModel.findById(id, orgId);
    if (!existing) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    if (existing.status !== "draft") {
      return res.status(400).json({
        error: "Only draft workflows can be published",
      });
    }

    const workflow = await WorkflowModel.publish(id, orgId);
    if (!workflow) {
      return res.status(500).json({ error: "Failed to publish workflow" });
    }

    // Log audit
    await AuditLogModel.create(orgId, userId, "workflow.published", {
      workflowId: workflow.id,
      name: workflow.name,
    });

    return res.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        publishedAt: workflow.published_at,
      },
    });
  } catch (error: unknown) {
    logger.error("Error publishing workflow", { error });
    const message =
      error instanceof Error ? error.message : "Failed to publish workflow";
    return res.status(400).json({ error: message });
  }
}

/**
 * Disable workflow
 */
export async function disable(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;
    const { id } = req.params;

    if (!orgId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existing = await WorkflowModel.findById(id, orgId);
    if (!existing) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    if (existing.status !== "published") {
      return res.status(400).json({
        error: "Only published workflows can be disabled",
      });
    }

    const workflow = await WorkflowModel.disable(id, orgId);
    if (!workflow) {
      return res.status(500).json({ error: "Failed to disable workflow" });
    }

    // Log audit
    await AuditLogModel.create(orgId, userId, "workflow.disabled", {
      workflowId: workflow.id,
      name: workflow.name,
    });

    return res.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
      },
    });
  } catch (error) {
    logger.error("Error disabling workflow", { error });
    return res.status(500).json({ error: "Failed to disable workflow" });
  }
}

/**
 * Duplicate workflow
 */
export async function duplicate(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;
    const { id } = req.params;

    if (!orgId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const workflow = await WorkflowModel.duplicate(id, orgId, userId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    // Log audit
    await AuditLogModel.create(orgId, userId, "workflow.duplicated", {
      originalId: id,
      newWorkflowId: workflow.id,
      name: workflow.name,
    });

    return res.status(201).json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        graph: workflow.graph_json,
        createdAt: workflow.created_at,
      },
    });
  } catch (error) {
    logger.error("Error duplicating workflow", { error });
    return res.status(500).json({ error: "Failed to duplicate workflow" });
  }
}

/**
 * Validate workflow
 */
export async function validate(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    const { id } = req.params;

    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const workflow = await WorkflowModel.findById(id, orgId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const result = WorkflowModel.validateGraph(workflow.graph_json);

    return res.json({
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (error) {
    logger.error("Error validating workflow", { error });
    return res.status(500).json({ error: "Failed to validate workflow" });
  }
}

/**
 * Preview/simulate workflow execution
 */
export async function preview(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    const { id } = req.params;
    const { mockData = {} } = req.body;

    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const workflow = await WorkflowModel.findById(id, orgId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const steps = WorkflowModel.simulateExecution(
      workflow.graph_json,
      mockData
    );

    return res.json({
      steps,
      totalNodes: workflow.graph_json.nodes.length,
      executedNodes: steps.filter((s) => s.status === "completed").length,
    });
  } catch (error) {
    logger.error("Error previewing workflow", { error });
    return res.status(500).json({ error: "Failed to preview workflow" });
  }
}

/**
 * Get available trigger types
 */
export function getTriggerTypes(req: Request, res: Response) {
  const triggerTypes = [
    {
      value: "client_created",
      label: "Client Created",
      description: "Triggers when a new client is created",
    },
    {
      value: "client_login",
      label: "Client Login",
      description: "Triggers when a client logs in",
    },
    {
      value: "client_logout",
      label: "Client Logout",
      description: "Triggers when a client logs out",
    },
    {
      value: "allocation_updated",
      label: "Allocation Updated",
      description: "Triggers when client allocation changes",
    },
    {
      value: "task_completed",
      label: "Task Completed",
      description: "Triggers when a task is completed",
    },
    {
      value: "manual",
      label: "Manual Trigger",
      description: "Manually triggered by developer",
    },
  ];

  return res.json({ triggerTypes });
}

/**
 * Get available action types
 */
export function getActionTypes(req: Request, res: Response) {
  const actionTypes = [
    {
      value: "allocate_client",
      label: "Allocate Client",
      description: "Allocate client to a project",
    },
    {
      value: "create_task",
      label: "Create Task",
      description: "Create a new task",
    },
    {
      value: "assign_role",
      label: "Assign Role",
      description: "Assign a role to client",
    },
    {
      value: "enable_feature",
      label: "Enable Feature",
      description: "Enable a feature for client",
    },
    {
      value: "disable_feature",
      label: "Disable Feature",
      description: "Disable a feature for client",
    },
    {
      value: "notify_developer",
      label: "Notify Developer",
      description: "Send notification to developer",
    },
    {
      value: "send_email",
      label: "Send Email",
      description: "Send an email to client",
    },
    {
      value: "webhook",
      label: "Webhook",
      description: "Call an external webhook",
    },
    {
      value: "delay",
      label: "Delay",
      description: "Wait for specified duration",
    },
  ];

  return res.json({ actionTypes });
}

/**
 * Get available condition fields
 */
export function getConditionFields(req: Request, res: Response) {
  const conditionFields = [
    { value: "client_type", label: "Client Type", type: "select" },
    { value: "org_plan", label: "Organization Plan", type: "select" },
    { value: "risk_score", label: "Risk Score", type: "number" },
    { value: "client_status", label: "Client Status", type: "select" },
    { value: "custom_field", label: "Custom Field", type: "text" },
  ];

  const operators = [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "contains", label: "Contains" },
    { value: "greater_than", label: "Greater Than" },
    { value: "less_than", label: "Less Than" },
    { value: "is_empty", label: "Is Empty" },
    { value: "is_not_empty", label: "Is Not Empty" },
  ];

  return res.json({ conditionFields, operators });
}

/**
 * Execute a published workflow
 */
export async function execute(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    const userId = req.user!.sub;
    const { id } = req.params;
    const { context = {} } = req.body;

    if (!orgId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Execute the workflow
    const result = await WorkflowExecutor.executeWorkflow(
      id,
      orgId,
      userId,
      context
    );

    if (!result.success && result.error) {
      return res.status(400).json({
        error: result.error,
        steps: result.steps,
      });
    }

    return res.json({
      success: result.success,
      workflowId: result.workflowId,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      duration: result.completedAt.getTime() - result.startedAt.getTime(),
      steps: result.steps,
    });
  } catch (error) {
    logger.error("Error executing workflow", { error });
    return res.status(500).json({ error: "Failed to execute workflow" });
  }
}
