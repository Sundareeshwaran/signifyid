"use client";

/**
 * Workflow Canvas
 *
 * Main canvas component using @xyflow/react for the workflow builder.
 * Supports zoom, pan, node rendering, and edge connections.
 * Uses React Flow's internal state management to prevent "uninitialized node" warnings.
 */

import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  BackgroundVariant,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
} from "@/lib/workflow.types";
import {
  TriggerNode,
  ActionNode,
  ConditionNode,
  EndNode,
} from "./workflow-node";
import { CustomEdge } from "./workflow-edge";

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onEdgesChange: (edges: WorkflowEdge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  selectedNodeId: string | null;
  readOnly?: boolean;
}

// Define custom node types - must be outside component to prevent recreation
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  end: EndNode,
};

// Define custom edge types - must be outside component to prevent recreation
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// Convert our workflow nodes to React Flow nodes
function toFlowNodes(
  nodes: WorkflowNode[],
  selectedNodeId: string | null
): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      isSelected: node.id === selectedNodeId,
    },
    selected: node.id === selectedNodeId,
  }));
}

// Convert our workflow edges to React Flow edges
function toFlowEdges(edges: WorkflowEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || "default",
    targetHandle: "input",
    type: "custom",
    data: { sourceHandle: edge.sourceHandle },
    animated: true,
    style: {
      stroke:
        edge.sourceHandle === "true"
          ? "#22c55e"
          : edge.sourceHandle === "false"
          ? "#ef4444"
          : "#6b7280",
      strokeWidth: 2,
    },
  }));
}

// Convert React Flow nodes back to our workflow nodes
function fromFlowNodes(flowNodes: Node[]): WorkflowNode[] {
  return flowNodes.map((node) => ({
    id: node.id,
    type: node.type as WorkflowNodeType,
    position: node.position,
    data: node.data,
  }));
}

// Convert React Flow edges back to our workflow edges
function fromFlowEdges(flowEdges: Edge[]): WorkflowEdge[] {
  return flowEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.data?.sourceHandle as "true" | "false" | undefined,
  }));
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onNodeSelect,
  selectedNodeId,
  readOnly = false,
}: WorkflowCanvasProps) {
  // Use React Flow's internal state management
  // Start with empty arrays - we'll sync from props in useEffect
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState<Edge>([]);

  // Track if we're currently syncing to prevent infinite loops
  const isSyncing = useRef(false);
  // Track if this is the initial mount
  const hasInitialized = useRef(false);
  // Track latest nodes/edges for use in callbacks
  const flowNodesRef = useRef<Node[]>([]);
  const flowEdgesRef = useRef<Edge[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    flowNodesRef.current = flowNodes;
  }, [flowNodes]);

  useEffect(() => {
    flowEdgesRef.current = flowEdges;
  }, [flowEdges]);

  // Sync external nodes/edges to React Flow state when props change
  useEffect(() => {
    // Skip if we're in the middle of propagating internal changes back to parent
    if (isSyncing.current) return;

    const newFlowNodes = toFlowNodes(nodes, selectedNodeId);
    const newFlowEdges = toFlowEdges(edges);

    // Always update React Flow state - this is safe in useEffect (after render)
    setFlowNodes(newFlowNodes);
    setFlowEdges(newFlowEdges);

    // Mark as initialized
    if (!hasInitialized.current) {
      hasInitialized.current = true;
    }
  }, [nodes, edges, selectedNodeId, setFlowNodes, setFlowEdges]);

  // Handle node changes from React Flow
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply changes to React Flow's internal state
      onFlowNodesChange(changes);

      // Check for selection changes
      for (const change of changes) {
        if (change.type === "select" && change.selected) {
          onNodeSelect(change.id);
        }
      }

      // Only propagate position/remove changes to parent
      const hasPositionOrRemove = changes.some(
        (c) => c.type === "position" || c.type === "remove"
      );

      if (hasPositionOrRemove) {
        // Set syncing flag to prevent effect from overwriting our changes
        isSyncing.current = true;
        // Wait for next frame to ensure React Flow has processed the changes
        requestAnimationFrame(() => {
          const workflowNodes = fromFlowNodes(flowNodesRef.current);
          onNodesChangeProp(workflowNodes);
          // Reset flag after a short delay to allow parent state update to complete
          setTimeout(() => {
            isSyncing.current = false;
          }, 50);
        });
      }
    },
    [onFlowNodesChange, onNodeSelect, onNodesChangeProp]
  );

  // Handle edge changes from React Flow
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      // Apply changes to React Flow's internal state
      onFlowEdgesChange(changes);

      const hasRemove = changes.some((c) => c.type === "remove");
      if (hasRemove) {
        // Set syncing flag to prevent effect from overwriting our changes
        isSyncing.current = true;
        requestAnimationFrame(() => {
          const workflowEdges = fromFlowEdges(flowEdgesRef.current);
          onEdgesChangeProp(workflowEdges);
          setTimeout(() => {
            isSyncing.current = false;
          }, 50);
        });
      }
    },
    [onFlowEdgesChange, onEdgesChangeProp]
  );

  // Handle new connections
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      if (!connection.source || !connection.target) return;

      // Check if edge already exists
      const exists = edges.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          e.sourceHandle === connection.sourceHandle
      );
      if (exists) return;

      const newEdge: WorkflowEdge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle:
          connection.sourceHandle === "true" ||
          connection.sourceHandle === "false"
            ? connection.sourceHandle
            : undefined,
      };

      onEdgesChangeProp([...edges, newEdge]);
    },
    [edges, onEdgesChangeProp, readOnly]
  );

  // Handle drop from palette
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return;
      event.preventDefault();

      const nodeType = event.dataTransfer.getData(
        "nodeType"
      ) as WorkflowNodeType;
      if (!nodeType) return;

      // Get the canvas position
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      // Snap to grid
      const snappedPosition = {
        x: Math.round(position.x / 20) * 20,
        y: Math.round(position.y / 20) * 20,
      };

      const newNode: WorkflowNode = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position: snappedPosition,
        data: {
          label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
        },
      };

      onNodesChangeProp([...nodes, newNode]);
    },
    [nodes, onNodesChangeProp, readOnly]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  // Handle pane click to deselect
  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <div
      className="w-full h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={readOnly ? null : "Delete"}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        defaultEdgeOptions={{
          type: "custom",
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="bg-muted/30"
        />
        <Controls showInteractive={!readOnly} />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case "trigger":
                return "#f43f5e";
              case "action":
                return "#3b82f6";
              case "condition":
                return "#a855f7";
              case "end":
                return "#6b7280";
              default:
                return "#6b7280";
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="bg-background/80!"
        />
      </ReactFlow>
    </div>
  );
}
