/**
 * Workflow Types
 *
 * TypeScript interfaces for the workflow builder
 */

// Node types
export type WorkflowNodeType = "trigger" | "action" | "condition" | "end";

// Trigger types
export type TriggerType =
  | "client_created"
  | "client_login"
  | "client_logout"
  | "allocation_updated"
  | "task_completed"
  | "manual";

// Action types
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

// Condition fields
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

// Node position
export interface NodePosition {
  x: number;
  y: number;
}

// Base node data
export interface WorkflowNodeData {
  label?: string;
  description?: string;
}

// Trigger node data
export interface TriggerNodeData extends WorkflowNodeData {
  triggerType: TriggerType;
  config?: Record<string, unknown>;
}

// Action node data
export interface ActionNodeData extends WorkflowNodeData {
  actionType: ActionType;
  config?: Record<string, unknown>;
}

// Condition node data
export interface ConditionNodeData extends WorkflowNodeData {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | boolean;
  customFieldName?: string;
}

// End node data
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
  // Optional measured dimensions for React Flow (prevents "uninitialized node" warning)
  measured?: { width: number; height: number };
}

// Workflow edge
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: "true" | "false";
  label?: string;
}

// Workflow graph
export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// Workflow status
export type WorkflowStatus = "draft" | "published" | "disabled";

// Workflow list item
export interface WorkflowListItem {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  nodeCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

// Full workflow
export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  graph: WorkflowGraph;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

// Validation result
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

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Simulation step
export interface SimulationStep {
  nodeId: string;
  nodeType: WorkflowNodeType;
  label: string;
  path?: "true" | "false";
  status: "pending" | "executing" | "completed" | "skipped";
}

// Trigger type option
export interface TriggerTypeOption {
  value: TriggerType;
  label: string;
  description: string;
}

// Action type option
export interface ActionTypeOption {
  value: ActionType;
  label: string;
  description: string;
}

// Condition field option
export interface ConditionFieldOption {
  value: ConditionField;
  label: string;
  type: "select" | "number" | "text";
}

// Operator option
export interface OperatorOption {
  value: ConditionOperator;
  label: string;
}

// Block palette item
export interface BlockPaletteItem {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

// Canvas state
export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

// Workflow context state
export interface WorkflowContextState {
  workflow: Workflow | null;
  selectedNodeId: string | null;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  canvasState: CanvasState;
  validationResult: ValidationResult | null;
}

// Block colors for styling (with dark mode support)
export const BLOCK_COLORS = {
  trigger: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    border: "border-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    accent: "#f43f5e",
  },
  action: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    border: "border-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    accent: "#3b82f6",
  },
  condition: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    border: "border-purple-500",
    text: "text-purple-600 dark:text-purple-400",
    accent: "#a855f7",
  },
  end: {
    bg: "bg-gray-500/10 dark:bg-gray-500/20",
    border: "border-gray-500",
    text: "text-gray-600 dark:text-gray-400",
    accent: "#6b7280",
  },
} as const;

// Default palette items
export const BLOCK_PALETTE: BlockPaletteItem[] = [
  {
    type: "trigger",
    label: "Trigger",
    description: "Starting point of workflow",
    icon: "Zap",
    color: "rose",
  },
  {
    type: "action",
    label: "Action",
    description: "Perform an operation",
    icon: "Play",
    color: "blue",
  },
  {
    type: "condition",
    label: "Condition",
    description: "If / Else branching",
    icon: "GitBranch",
    color: "purple",
  },
  {
    type: "end",
    label: "End",
    description: "Workflow termination",
    icon: "Square",
    color: "gray",
  },
];
