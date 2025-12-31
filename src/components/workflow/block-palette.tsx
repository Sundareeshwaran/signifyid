"use client";

/**
 * Block Palette
 *
 * Sidebar with draggable block types for the workflow builder.
 */

import { Zap, Play, GitBranch, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCK_COLORS } from "@/lib/workflow.types";
import type { WorkflowNodeType } from "@/lib/workflow.types";

interface BlockPaletteItemProps {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: typeof Zap;
  disabled?: boolean;
}

const PALETTE_ITEMS: BlockPaletteItemProps[] = [
  {
    type: "trigger",
    label: "Trigger",
    description: "Starting point",
    icon: Zap,
    disabled: true, // Only one trigger allowed
  },
  {
    type: "action",
    label: "Action",
    description: "Perform an operation",
    icon: Play,
  },
  {
    type: "condition",
    label: "Condition",
    description: "If / Else branching",
    icon: GitBranch,
  },
  {
    type: "end",
    label: "End",
    description: "Workflow termination",
    icon: Square,
  },
];

function PaletteItem({
  type,
  label,
  description,
  icon: Icon,
  disabled = false,
}: BlockPaletteItemProps) {
  const colors = BLOCK_COLORS[type];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("nodeType", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 transition-all select-none",
        colors.bg,
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-105"
      )}
      style={{ borderColor: colors.accent }}
      draggable={!disabled}
      onDragStart={handleDragStart}
    >
      <div
        className={cn("p-2 rounded-md", colors.text)}
        style={{ backgroundColor: `${colors.accent}20` }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("font-medium text-sm", colors.text)}>{label}</div>
        <div className="text-xs text-muted-foreground truncate">
          {description}
        </div>
      </div>
    </div>
  );
}

export function BlockPalette() {
  return (
    <div className="w-72 shrink-0 border-r bg-background p-4 space-y-3 overflow-y-auto">
      <div className="mb-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Blocks
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Drag blocks onto the canvas
        </p>
      </div>

      {PALETTE_ITEMS.map((item) => (
        <PaletteItem key={item.type} {...item} />
      ))}

      <div className="pt-4 border-t mt-4 text-xs text-muted-foreground space-y-2">
        <p>
          <strong className="text-rose-600 dark:text-rose-400">Trigger:</strong>{" "}
          Entry point (1 per workflow)
        </p>
        <p>
          <strong className="text-blue-600 dark:text-blue-400">Action:</strong>{" "}
          Operation to execute
        </p>
        <p>
          <strong className="text-purple-600 dark:text-purple-400">
            Condition:
          </strong>{" "}
          Branch based on logic
        </p>
        <p>
          <strong className="text-gray-600 dark:text-gray-400">End:</strong>{" "}
          Terminate workflow
        </p>
      </div>

      <div className="pt-4 border-t mt-4 text-xs text-muted-foreground">
        <p className="font-medium mb-1">💡 Tip: Connect nodes</p>
        <p>
          Drag from the ○ handle at the bottom of a block to the ○ handle at the
          top of another block.
        </p>
      </div>
    </div>
  );
}
