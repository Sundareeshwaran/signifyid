/**
 * Workflow Model
 *
 * Data access layer for workflow operations including
 * CRUD, publishing, and validation.
 */
import { v4 as uuidv4 } from "uuid";
import { query } from "../config/db.js";

// Workflow node types
export type WorkflowNodeType = "trigger" | "action" | "condition" | "end";

// Trigger types for workflow automation
export type TriggerType =
  | "client_created"
  | "client_login"
  | "client_logout"
  | "allocation_updated"
  | "task_completed"
  | "manual";

// Action types for workflow operations
export type ActionType =
  | "allocate_client"
  | "create_task"
  | "assign_role"
  | "enable_feature"
  | "disable_feature"
  | "notify_developer"
  | "send_email"
  | "webhook"
  | "delay";

// Condition field types for branching
export type ConditionField =
  | "client_type"
  | "org_plan"
  | "risk_score"
  | "client_status"
  | "custom_field";

// Condition operators
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty";

// Workflow node position
export interface NodePosition {
  x: number;
  y: number;
}

// Base node data
export interface WorkflowNodeData {
  label?: string;
  description?: string;
}

// Trigger node specific data
export interface TriggerNodeData extends WorkflowNodeData {
  triggerType: TriggerType;
  config?: Record<string, unknown>;
}

// Action node specific data
export interface ActionNodeData extends WorkflowNodeData {
  actionType: ActionType;
  config?: Record<string, unknown>;
}

// Condition node specific data
export interface ConditionNodeData extends WorkflowNodeData {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | boolean;
  customFieldName?: string;
}

// End node specific data
export interface EndNodeData extends WorkflowNodeData {
  status?: "success" | "failure" | "cancelled";
}

// Union type for all node data
export type NodeData =
  | TriggerNodeData
  | ActionNodeData
  | ConditionNodeData
  | EndNodeData;

// Workflow node
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: NodePosition;
  data: NodeData;
}

// Workflow edge connection
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: "true" | "false"; // For condition blocks
  label?: string;
}

// Workflow graph structure
export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// Workflow status
export type WorkflowStatus = "draft" | "published" | "disabled";

// Workflow from database
export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  graph_json: WorkflowGraph;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
}

/**
 * List all workflows for an organization
 */
export async function list(
  orgId: string,
  options?: { status?: WorkflowStatus }
): Promise<Workflow[]> {
  let queryText = `
    SELECT id, org_id, name, description, status, graph_json, created_by, created_at, updated_at, published_at
    FROM workflows
    WHERE org_id = $1
  `;
  const params: (string | WorkflowStatus)[] = [orgId];

  if (options?.status) {
    queryText += ` AND status = $2`;
    params.push(options.status);
  }

  queryText += ` ORDER BY updated_at DESC`;

  const result = await query<Workflow>(queryText, params);
  return result.rows;
}

/**
 * Find workflow by ID
 */
export async function findById(
  id: string,
  orgId: string
): Promise<Workflow | null> {
  const result = await query<Workflow>(
    `SELECT id, org_id, name, description, status, graph_json, created_by, created_at, updated_at, published_at
     FROM workflows
     WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new workflow
 */
export async function create(
  orgId: string,
  createdBy: string,
  name: string,
  description?: string
): Promise<Workflow> {
  const id = uuidv4();
  const initialGraph: WorkflowGraph = {
    nodes: [
      {
        id: `trigger-${uuidv4().slice(0, 8)}`,
        type: "trigger",
        position: { x: 250, y: 50 },
        data: {
          label: "Trigger",
          triggerType: "manual",
        } as TriggerNodeData,
      },
    ],
    edges: [],
  };

  const result = await query<Workflow>(
    `INSERT INTO workflows (id, org_id, name, description, status, graph_json, created_by)
     VALUES ($1, $2, $3, $4, 'draft', $5, $6)
     RETURNING id, org_id, name, description, status, graph_json, created_by, created_at, updated_at, published_at`,
    [
      id,
      orgId,
      name,
      description || null,
      JSON.stringify(initialGraph),
      createdBy,
    ]
  );

  return result.rows[0];
}

/**
 * Update workflow
 */
export async function update(
  id: string,
  orgId: string,
  data: {
    name?: string;
    description?: string;
    graph_json?: WorkflowGraph;
  }
): Promise<Workflow | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.graph_json !== undefined) {
    updates.push(`graph_json = $${paramIndex++}`);
    values.push(JSON.stringify(data.graph_json));
  }

  if (updates.length === 0) {
    return findById(id, orgId);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id, orgId);

  const result = await query<Workflow>(
    `UPDATE workflows SET ${updates.join(", ")}
     WHERE id = $${paramIndex} AND org_id = $${
      paramIndex + 1
    } AND status != 'published'
     RETURNING id, org_id, name, description, status, graph_json, created_by, created_at, updated_at, published_at`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Delete workflow
 */
export async function remove(id: string, orgId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM workflows WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Publish workflow (makes it immutable)
 */
export async function publish(
  id: string,
  orgId: string
): Promise<Workflow | null> {
  // First validate
  const workflow = await findById(id, orgId);
  if (!workflow) return null;

  const validation = validateGraph(workflow.graph_json);
  if (!validation.valid) {
    throw new Error(
      `Workflow validation failed: ${validation.errors
        .map((e) => e.message)
        .join(", ")}`
    );
  }

  const result = await query<Workflow>(
    `UPDATE workflows SET status = 'published', published_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND org_id = $2 AND status = 'draft'
     RETURNING id, org_id, name, description, status, graph_json, created_by, created_at, updated_at, published_at`,
    [id, orgId]
  );

  return result.rows[0] || null;
}

/**
 * Disable workflow
 */
export async function disable(
  id: string,
  orgId: string
): Promise<Workflow | null> {
  const result = await query<Workflow>(
    `UPDATE workflows SET status = 'disabled', updated_at = NOW()
     WHERE id = $1 AND org_id = $2 AND status = 'published'
     RETURNING id, org_id, name, description, status, graph_json, created_by, created_at, updated_at, published_at`,
    [id, orgId]
  );

  return result.rows[0] || null;
}

/**
 * Duplicate workflow
 */
export async function duplicate(
  id: string,
  orgId: string,
  createdBy: string
): Promise<Workflow | null> {
  const original = await findById(id, orgId);
  if (!original) return null;

  const newId = uuidv4();
  const result = await query<Workflow>(
    `INSERT INTO workflows (id, org_id, name, description, status, graph_json, created_by)
     VALUES ($1, $2, $3, $4, 'draft', $5, $6)
     RETURNING id, org_id, name, description, status, graph_json, created_by, created_at, updated_at, published_at`,
    [
      newId,
      orgId,
      `${original.name} (Copy)`,
      original.description,
      JSON.stringify(original.graph_json),
      createdBy,
    ]
  );

  return result.rows[0];
}

/**
 * Validate workflow graph
 */
export function validateGraph(graph: WorkflowGraph): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const { nodes, edges } = graph;

  // Check for trigger node
  const triggerNodes = nodes.filter((n) => n.type === "trigger");
  if (triggerNodes.length === 0) {
    errors.push({
      code: "NO_TRIGGER",
      message: "Workflow must have exactly one trigger block",
    });
  } else if (triggerNodes.length > 1) {
    errors.push({
      code: "MULTIPLE_TRIGGERS",
      message: "Workflow can only have one trigger block",
    });
  }

  // Check for end node
  const endNodes = nodes.filter((n) => n.type === "end");
  if (endNodes.length === 0) {
    warnings.push({
      code: "NO_END",
      message: "Workflow should have at least one end block",
    });
  }

  // Check for orphan nodes (nodes with no connections)
  const connectedNodeIds = new Set<string>();
  edges.forEach((e) => {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  });

  nodes.forEach((node) => {
    if (node.type !== "trigger" && !connectedNodeIds.has(node.id)) {
      warnings.push({
        code: "ORPHAN_NODE",
        message: `Block "${node.data.label || node.id}" is not connected`,
        nodeId: node.id,
      });
    }
  });

  // Check for circular dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingEdges = edges.filter((e) => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (hasCycle(edge.target)) return true;
    }

    recursionStack.delete(nodeId);
    return false;
  }

  if (triggerNodes.length > 0 && hasCycle(triggerNodes[0].id)) {
    errors.push({
      code: "CIRCULAR_DEPENDENCY",
      message: "Workflow contains circular dependencies",
    });
  }

  // Check condition nodes have both true and false paths
  const conditionNodes = nodes.filter((n) => n.type === "condition");
  conditionNodes.forEach((node) => {
    const nodeEdges = edges.filter((e) => e.source === node.id);
    const hasTrue = nodeEdges.some((e) => e.sourceHandle === "true");
    const hasFalse = nodeEdges.some((e) => e.sourceHandle === "false");

    if (!hasTrue) {
      warnings.push({
        code: "MISSING_TRUE_PATH",
        message: `Condition block "${
          node.data.label || node.id
        }" is missing true path`,
        nodeId: node.id,
      });
    }
    if (!hasFalse) {
      warnings.push({
        code: "MISSING_FALSE_PATH",
        message: `Condition block "${
          node.data.label || node.id
        }" is missing false path`,
        nodeId: node.id,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Simulate workflow execution (preview mode)
 */
export interface SimulationStep {
  nodeId: string;
  nodeType: WorkflowNodeType;
  label: string;
  path?: "true" | "false";
  status: "pending" | "executing" | "completed" | "skipped";
}

export function simulateExecution(
  graph: WorkflowGraph,
  mockData: Record<string, unknown> = {}
): SimulationStep[] {
  const steps: SimulationStep[] = [];
  const { nodes, edges } = graph;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Find trigger node
  const triggerNode = nodes.find((n) => n.type === "trigger");
  if (!triggerNode) return steps;

  const visited = new Set<string>();

  function traverse(nodeId: string, path?: "true" | "false") {
    if (visited.has(nodeId)) return; // Prevent infinite loops
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    steps.push({
      nodeId: node.id,
      nodeType: node.type,
      label: node.data.label || node.type,
      path,
      status: "completed",
    });

    if (node.type === "end") return;

    // Get outgoing edges
    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    if (node.type === "condition") {
      // Evaluate condition (mock for now)
      const conditionResult = evaluateMockCondition(
        node.data as ConditionNodeData,
        mockData
      );
      const nextEdge = outgoingEdges.find(
        (e) => e.sourceHandle === (conditionResult ? "true" : "false")
      );
      if (nextEdge) {
        traverse(nextEdge.target, conditionResult ? "true" : "false");
      }
    } else {
      // Follow all outgoing edges for non-condition nodes
      outgoingEdges.forEach((edge) => {
        traverse(edge.target);
      });
    }
  }

  traverse(triggerNode.id);
  return steps;
}

function evaluateMockCondition(
  data: ConditionNodeData,
  mockData: Record<string, unknown>
): boolean {
  const fieldValue = mockData[data.field];
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
