"use client";

/**
 * Block Editor Panel
 *
 * Side panel for editing the selected workflow block.
 * Shows configuration options based on block type.
 */

import { X, Zap, Play, GitBranch, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  WorkflowNode,
  TriggerType,
  ActionType,
  ConditionField,
  ConditionOperator,
} from "@/lib/workflow.types";
import { BLOCK_COLORS } from "@/lib/workflow.types";

interface BlockEditorPanelProps {
  node?: WorkflowNode;
  onUpdate: (node: WorkflowNode) => void;
  onClose: () => void;
  readOnly?: boolean;
}

const TRIGGER_TYPES: { value: TriggerType; label: string }[] = [
  { value: "manual", label: "Manual Trigger" },
  { value: "client_created", label: "Client Created" },
  { value: "client_login", label: "Client Login" },
  { value: "client_logout", label: "Client Logout" },
  { value: "allocation_updated", label: "Allocation Updated" },
  { value: "task_completed", label: "Task Completed" },
];

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: "allocate_client", label: "Allocate Client" },
  { value: "create_task", label: "Create Task" },
  { value: "assign_role", label: "Assign Role" },
  { value: "enable_feature", label: "Enable Feature" },
  { value: "disable_feature", label: "Disable Feature" },
  { value: "notify_developer", label: "Notify Developer" },
  { value: "send_email", label: "Send Email" },
  { value: "webhook", label: "Webhook" },
  { value: "delay", label: "Delay" },
];

const CONDITION_FIELDS: { value: ConditionField; label: string }[] = [
  { value: "client_type", label: "Client Type" },
  { value: "org_plan", label: "Organization Plan" },
  { value: "risk_score", label: "Risk Score" },
  { value: "client_status", label: "Client Status" },
  { value: "custom_field", label: "Custom Field" },
];

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
];

const NODE_ICONS = {
  trigger: Zap,
  action: Play,
  condition: GitBranch,
  end: Square,
};

export function BlockEditorPanel({
  node,
  onUpdate,
  onClose,
  readOnly = false,
}: BlockEditorPanelProps) {
  if (!node) {
    return null;
  }

  const colors = BLOCK_COLORS[node.type];
  const Icon = NODE_ICONS[node.type];

  const updateData = (updates: Partial<typeof node.data>) => {
    if (readOnly) return;
    onUpdate({
      ...node,
      data: { ...node.data, ...updates },
    });
  };

  return (
    <div className="w-80 border-l bg-background flex flex-col">
      {/* Header */}
      <div
        className={cn(
          "px-4 py-3 border-b flex items-center justify-between",
          colors.bg
        )}
        style={{ borderBottomColor: `${colors.accent}40` }}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", colors.text)} />
          <span className={cn("font-semibold capitalize", colors.text)}>
            {node.type} Block
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            value={node.data.label || ""}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Block label"
            disabled={readOnly}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={node.data.description || ""}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder="Optional description"
            rows={2}
            disabled={readOnly}
          />
        </div>

        {/* Type-specific fields */}
        {node.type === "trigger" && (
          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <Select
              value={
                (node.data as { triggerType?: TriggerType }).triggerType ||
                "manual"
              }
              onValueChange={(value: TriggerType) =>
                updateData({ triggerType: value })
              }
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {node.type === "action" && (
          <div className="space-y-2">
            <Label>Action Type</Label>
            <Select
              value={
                (node.data as { actionType?: ActionType }).actionType ||
                "allocate_client"
              }
              onValueChange={(value: ActionType) =>
                updateData({ actionType: value })
              }
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {node.type === "condition" && (
          <>
            <div className="space-y-2">
              <Label>Condition Field</Label>
              <Select
                value={
                  (node.data as { field?: ConditionField }).field ||
                  "client_type"
                }
                onValueChange={(value: ConditionField) =>
                  updateData({ field: value })
                }
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Operator</Label>
              <Select
                value={
                  (node.data as { operator?: ConditionOperator }).operator ||
                  "equals"
                }
                onValueChange={(value: ConditionOperator) =>
                  updateData({ operator: value })
                }
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={String(
                  (node.data as { value?: string | number | boolean }).value ||
                    ""
                )}
                onChange={(e) => updateData({ value: e.target.value })}
                placeholder="Comparison value"
                disabled={readOnly}
              />
            </div>
          </>
        )}

        {node.type === "end" && (
          <div className="space-y-2">
            <Label>End Status</Label>
            <Select
              value={(node.data as { status?: string }).status || "success"}
              onValueChange={(value) =>
                updateData({
                  status: value as "success" | "failure" | "cancelled",
                })
              }
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 py-3 border-t text-xs text-muted-foreground">
        <p>ID: {node.id}</p>
        <p>
          Position: ({node.position.x}, {node.position.y})
        </p>
      </div>
    </div>
  );
}
