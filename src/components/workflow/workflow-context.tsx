"use client";

/**
 * Workflow Context
 *
 * React context for managing workflow state including
 * nodes, edges, selection, and save/publish operations.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { workflowsApi } from "@/lib/api";
import type {
  Workflow,
  WorkflowGraph,
  ValidationResult,
} from "@/lib/workflow.types";

interface WorkflowContextValue {
  workflow: Workflow | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error: string | null;
  selectedNodeId: string | null;
  validationResult: ValidationResult | null;

  // Actions
  save: () => Promise<void>;
  validate: () => Promise<ValidationResult | null>;
  publish: () => Promise<void>;
  updateGraph: (graph: WorkflowGraph) => void;
  selectNode: (nodeId: string | null) => void;
  setError: (error: string | null) => void;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

interface WorkflowProviderProps {
  workflowId: string;
  children: ReactNode;
}

export function WorkflowProvider({
  workflowId,
  children,
}: WorkflowProviderProps) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [originalGraph, setOriginalGraph] = useState<WorkflowGraph | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);

  // Load workflow
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      const result = await workflowsApi.get(workflowId);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setWorkflow(result.data.workflow);
        setOriginalGraph(result.data.workflow.graph);
      }

      setIsLoading(false);
    }

    load();
  }, [workflowId]);

  // Check if dirty
  const isDirty =
    workflow && originalGraph
      ? JSON.stringify(workflow.graph) !== JSON.stringify(originalGraph)
      : false;

  // Update graph
  const updateGraph = useCallback((graph: WorkflowGraph) => {
    setWorkflow((prev) => (prev ? { ...prev, graph } : null));
    // Clear validation when graph changes
    setValidationResult(null);
  }, []);

  // Select node
  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  // Save workflow
  const save = useCallback(async () => {
    if (!workflow || workflow.status === "published") return;

    setIsSaving(true);
    setError(null);

    const result = await workflowsApi.update(workflow.id, {
      graph: workflow.graph,
    });

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setWorkflow(result.data.workflow);
      setOriginalGraph(result.data.workflow.graph);
    }

    setIsSaving(false);
  }, [workflow]);

  // Validate workflow
  const validate = useCallback(async (): Promise<ValidationResult | null> => {
    if (!workflow) return null;

    // First save if dirty
    if (isDirty) {
      await save();
    }

    const result = await workflowsApi.validate(workflow.id);

    if (result.error) {
      setError(result.error);
      return null;
    }

    if (result.data) {
      setValidationResult(result.data);
      return result.data;
    }

    return null;
  }, [workflow, isDirty, save]);

  // Publish workflow
  const publish = useCallback(async () => {
    if (!workflow) return;

    setIsSaving(true);
    setError(null);

    const result = await workflowsApi.publish(workflow.id);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setWorkflow(result.data.workflow);
    }

    setIsSaving(false);
  }, [workflow]);

  const value: WorkflowContextValue = {
    workflow,
    isLoading,
    isSaving,
    isDirty,
    error,
    selectedNodeId,
    validationResult,
    save,
    validate,
    publish,
    updateGraph,
    selectNode,
    setError,
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow(): WorkflowContextValue {
  const context = useContext(WorkflowContext);

  if (!context) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }

  return context;
}
