"use client";

/**
 * Workflow Node Components
 *
 * Custom React Flow nodes with type-specific styling,
 * proper input/output handles for connections.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Zap, Play, GitBranch, Square, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCK_COLORS } from "@/lib/workflow.types";

// Define node data types
type WorkflowNodeData = {
  label?: string;
  description?: string;
  triggerType?: string;
  actionType?: string;
  field?: string;
  status?: string;
  isSelected?: boolean;
};

// Handle styles for consistent appearance
const handleStyle = {
  width: 12,
  height: 12,
  border: "2px solid",
  background: "var(--background)",
};

// Base node wrapper component
function NodeWrapper({
  children,
  type,
  selected,
}: {
  children: React.ReactNode;
  type: "trigger" | "action" | "condition" | "end";
  selected?: boolean;
}) {
  const colors = BLOCK_COLORS[type];

  return (
    <div
      className={cn(
        "w-50 rounded-lg border-2 shadow-sm transition-all select-none group",
        colors.bg,
        selected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{ borderColor: colors.accent }}
    >
      {children}
    </div>
  );
}

// Node header component
function NodeHeader({
  type,
  label,
  icon: Icon,
}: {
  type: "trigger" | "action" | "condition" | "end";
  label: string;
  icon: React.ElementType;
}) {
  const colors = BLOCK_COLORS[type];

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 border-b rounded-t-md",
        colors.text
      )}
      style={{ borderColor: `${colors.accent}40` }}
    >
      <GripVertical className="h-4 w-4 opacity-50 cursor-grab" />
      <Icon className="h-4 w-4" />
      <span className="font-medium text-sm flex-1 truncate">{label}</span>
    </div>
  );
}

// Node body component
function NodeBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-xs text-muted-foreground">{children}</div>
  );
}

// Define typed node props
type CustomNodeProps = NodeProps<Node<WorkflowNodeData>>;

// Trigger Node - No input handle, one output handle
export const TriggerNode = memo(({ data, selected }: CustomNodeProps) => {
  const colors = BLOCK_COLORS.trigger;
  const nodeData = data as WorkflowNodeData;

  return (
    <NodeWrapper type="trigger" selected={selected}>
      <NodeHeader
        type="trigger"
        label={String(nodeData.label || "Trigger")}
        icon={Zap}
      />
      <NodeBody>
        <span>{String(nodeData.triggerType || "Manual trigger")}</span>
      </NodeBody>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        style={{
          ...handleStyle,
          borderColor: colors.accent,
        }}
        className="-bottom-1.5!"
      />
    </NodeWrapper>
  );
});

TriggerNode.displayName = "TriggerNode";

// Action Node - One input handle, one output handle
export const ActionNode = memo(({ data, selected }: CustomNodeProps) => {
  const colors = BLOCK_COLORS.action;
  const nodeData = data as WorkflowNodeData;

  return (
    <NodeWrapper type="action" selected={selected}>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{
          ...handleStyle,
          borderColor: colors.accent,
        }}
        className="-top-1.5!"
      />

      <NodeHeader
        type="action"
        label={String(nodeData.label || "Action")}
        icon={Play}
      />
      <NodeBody>
        <span>{String(nodeData.actionType || "Action")}</span>
      </NodeBody>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        style={{
          ...handleStyle,
          borderColor: colors.accent,
        }}
        className="-bottom-1.5!"
      />
    </NodeWrapper>
  );
});

ActionNode.displayName = "ActionNode";

// Condition Node - One input handle, two output handles (true/false)
export const ConditionNode = memo(({ data, selected }: CustomNodeProps) => {
  const colors = BLOCK_COLORS.condition;
  const nodeData = data as WorkflowNodeData;

  return (
    <NodeWrapper type="condition" selected={selected}>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{
          ...handleStyle,
          borderColor: colors.accent,
        }}
        className="-top-1.5!"
      />

      <NodeHeader
        type="condition"
        label={String(nodeData.label || "Condition")}
        icon={GitBranch}
      />
      <NodeBody>
        <span>{String(nodeData.field || "Configure condition...")}</span>
      </NodeBody>

      {/* True output handle (left side) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{
          ...handleStyle,
          borderColor: "#22c55e",
          left: "25%",
        }}
        className="-bottom-1.5!"
      />
      <span className="absolute -bottom-6 left-[25%] -translate-x-1/2 text-[10px] font-medium text-green-600">
        Yes
      </span>

      {/* False output handle (right side) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{
          ...handleStyle,
          borderColor: "#ef4444",
          left: "75%",
        }}
        className="-bottom-1.5!"
      />
      <span className="absolute -bottom-6 left-[75%] -translate-x-1/2 text-[10px] font-medium text-red-600">
        No
      </span>
    </NodeWrapper>
  );
});

ConditionNode.displayName = "ConditionNode";

// End Node - One input handle, no output handle
export const EndNode = memo(({ data, selected }: CustomNodeProps) => {
  const colors = BLOCK_COLORS.end;
  const nodeData = data as WorkflowNodeData;

  return (
    <NodeWrapper type="end" selected={selected}>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{
          ...handleStyle,
          borderColor: colors.accent,
        }}
        className="-top-1.5!"
      />

      <NodeHeader
        type="end"
        label={String(nodeData.label || "End")}
        icon={Square}
      />
      <NodeBody>
        <span>{String(nodeData.status || "Workflow ends")}</span>
      </NodeBody>
    </NodeWrapper>
  );
});

EndNode.displayName = "EndNode";
