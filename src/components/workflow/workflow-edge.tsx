"use client";

/**
 * Custom Edge Component
 *
 * Custom React Flow edge with bezier curves and color coding
 * based on source handle (true = green, false = red).
 */

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";

export const CustomEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    sourceHandleId,
    selected,
    style = {},
    data,
  }: EdgeProps) => {
    // Calculate bezier path
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    // Determine edge color based on source handle
    let strokeColor = "#6b7280"; // gray-500 as default
    if (sourceHandleId === "true" || data?.sourceHandle === "true") {
      strokeColor = "#22c55e"; // green-500
    } else if (sourceHandleId === "false" || data?.sourceHandle === "false") {
      strokeColor = "#ef4444"; // red-500
    }

    return (
      <>
        {/* Main edge path */}
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            ...style,
            stroke: strokeColor,
            strokeWidth: selected ? 3 : 2,
            strokeDasharray: "8 4",
          }}
        />

        {/* Animated overlay for flow effect */}
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeDasharray="4 8"
          strokeLinecap="round"
          style={{
            opacity: 0.5,
            animation: "dash 1s linear infinite",
          }}
        />

        {/* Arrow marker at target */}
        <defs>
          <marker
            id={`arrow-${id}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={strokeColor} />
          </marker>
        </defs>

        {/* Edge label renderer for delete button on hover */}
        {selected && (
          <EdgeLabelRenderer>
            <div
              className="nodrag nopan pointer-events-auto"
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              }}
            >
              <button
                className="w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                onClick={(e) => {
                  e.stopPropagation();
                  // Edge deletion is handled by React Flow's deleteKeyCode
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }
);

CustomEdge.displayName = "CustomEdge";
