'use client';

import React from 'react';
import axios from 'axios';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { WorkflowNode, WorkflowState } from './types/workflow';
import { NODE_TYPES, TRIGGER_TYPES } from '@/lib/workflow/node-types';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';

// Create axios-based fetcher factory that includes headers
const createFetcher = (headers: HeadersInit) => {
  return async <T,>(url: string): Promise<T> => {
    try {
      const response = await axios.get<T>(url, { headers });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const err = new Error('An error occurred while fetching the data.') as Error & { status?: number };
        err.status = error.response?.status;
        throw err;
      }
      throw error;
    }
  };
};

type WorkflowContextValue = {
  workflow: WorkflowState | null;
  isLoading: boolean;
  error: Error | undefined;
  setWorkflow: (next: WorkflowState | ((prev: WorkflowState | null) => WorkflowState)) => void;
  saveNodes: (nodes: WorkflowNode[], opts?: { optimistic?: boolean }) => Promise<void>;
  saveWorkflowName: (name: string) => Promise<void>;
  activateWorkflow: () => Promise<void>;
  deactivateWorkflow: () => Promise<void>;
  nodeTypes: typeof NODE_TYPES;
  triggerTypes: typeof TRIGGER_TYPES;
  refresh: () => void;
  deleteNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;
};

const WorkflowContext = React.createContext<WorkflowContextValue | undefined>(undefined);

async function putJson<T = unknown>(url: string, body: unknown, headers: HeadersInit): Promise<T> {
  try {
    const response = await axios.put<T>(url, body, { headers });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data || error.message || `Failed request: ${error.response?.status}`;
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }
    throw error;
  }
}

async function patchJson(url: string, body: unknown, headers: HeadersInit) {
  try {
    const response = await axios.patch(url, body, { headers });
    return response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data || error.message || `Failed request: ${error.response?.status}`;
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }
    throw error;
  }
}

export function WorkflowProvider({ id, children }: { id: string; children: React.ReactNode }) {
  const key = id ? `/api/workflows/${id}` : null;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();

  // Get headers for API calls
  const headers = React.useMemo(() => {
    if (!customerId || !workspace) return {};
    return getAgentHeaders(customerId, customerName);
  }, [customerId, customerName, workspace]);

  // Create fetcher with headers
  const fetcher = React.useMemo(() => {
    if (!customerId || !workspace) return () => Promise.reject(new Error('Not authenticated'));
    return createFetcher(headers);
  }, [headers, customerId, workspace]);

  // Initialize selectedNodeId from URL if available
  const [selectedNodeId, setSelectedNodeIdState] = React.useState<string | null>(searchParams.get('nodeId') || null);

  // Track if we've done initial node selection
  const hasInitializedSelection = React.useRef(false);

  const { data, error, isLoading, mutate } = useSWR<WorkflowState>(key && customerId && workspace ? key : null, fetcher);

  // Wrapper function to update both state and URL
  const setSelectedNodeId = React.useCallback(
    (nodeId: string | null) => {
      setSelectedNodeIdState(nodeId);

      // Update URL with the selected node
      const params = new URLSearchParams(searchParams.toString());
      if (nodeId) {
        params.set('nodeId', nodeId);
      } else {
        params.delete('nodeId');
      }

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Validate and sync selectedNodeId with workflow data - only on initial load or if selected node is deleted
  React.useEffect(() => {
    if (!data?.nodes || data.nodes.length === 0) {
      hasInitializedSelection.current = false;
      return;
    }

    // Check if the currently selected node exists in the workflow
    const nodeExists = selectedNodeId && data.nodes.some((node) => node.id === selectedNodeId);

    // Only auto-select if:
    // 1. We haven't initialized yet, OR
    // 2. The selected node no longer exists AND we have a valid selectedNodeId (i.e., not intentionally null)
    if (!hasInitializedSelection.current || (!nodeExists && selectedNodeId !== null)) {
      // If no valid node is selected, select the first node
      const firstNode = data.nodes[0];
      if (firstNode) {
        setSelectedNodeId(firstNode.id);
        hasInitializedSelection.current = true;
      }
    }
  }, [data?.nodes, selectedNodeId, setSelectedNodeId]);

  const { trigger: triggerSave } = useSWRMutation(
    key && customerId && workspace ? `${key}/nodes` : null,
    async (_url, { arg }: { arg: WorkflowState['nodes'] }) => {
      if (!key || !customerId || !workspace) return null;
      const updatedWorkflow = await putJson<WorkflowState>(`${key}/nodes`, { nodes: arg }, headers);
      return updatedWorkflow;
    }
  );

  const setWorkflow = React.useCallback(
    (next: WorkflowState | ((prev: WorkflowState | null) => WorkflowState)) => {
      mutate(
        (prev) => {
          const nextValue =
            typeof next === 'function' ? (next as (p: WorkflowState | null) => WorkflowState)(prev ?? null) : next;
          return nextValue;
        },
        { revalidate: false }
      );
    },
    [mutate]
  );

  const saveNodes = React.useCallback(
    async (nodes: WorkflowState['nodes'], opts?: { optimistic?: boolean }) => {
      if (!data) return;

      if (opts?.optimistic !== false) {
        // Use SWR's built-in optimistic update pattern
        await mutate(
          async () => {
            try {
              const updatedWorkflow = await triggerSave(nodes);
              return updatedWorkflow ?? undefined;
            } catch (error) {
              console.error('Failed to save nodes:', error);
              throw error;
            }
          },
          {
            optimisticData: { ...data, nodes },
            rollbackOnError: true,
            revalidate: false,
          }
        );
      } else {
        // Non-optimistic update - just call the API and update with response
        try {
          const updatedWorkflow = await triggerSave(nodes);
          if (updatedWorkflow) {
            mutate(updatedWorkflow, { revalidate: false });
          }
        } catch (error) {
          console.error('Failed to save nodes:', error);
          mutate();
          throw error;
        }
      }
    },
    [triggerSave, mutate, data]
  );

  const deleteNode = React.useCallback(
    async (nodeId: string) => {
      if (!data) return;

      let deletedIndex = -1;
      let updatedNodes: WorkflowState['nodes'] = [];
      let nextNodeId: string | null = null;

      // Calculate updates from current data
      const currentNodes = data.nodes ?? [];
      deletedIndex = currentNodes.findIndex((n) => n.id === nodeId);
      updatedNodes = currentNodes.filter((n) => n.id !== nodeId);

      // Calculate next node to select if needed
      if (selectedNodeId === nodeId && updatedNodes.length > 0) {
        const newIndex = Math.min(deletedIndex, updatedNodes.length - 1);
        nextNodeId = updatedNodes[newIndex].id;
      }

      // Update selection and URL based on the deletion
      if (selectedNodeId === nodeId) {
        if (nextNodeId) {
          setSelectedNodeIdState(nextNodeId);
          // Update URL to reflect the new selection
          const params = new URLSearchParams(searchParams.toString());
          params.set('nodeId', nextNodeId);
          const newUrl = `${pathname}?${params.toString()}`;
          router.replace(newUrl, { scroll: false });
        } else {
          // No nodes left, clear selection
          setSelectedNodeIdState(null);
          // Update URL to remove nodeId
          const params = new URLSearchParams(searchParams.toString());
          params.delete('nodeId');
          const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
          router.replace(newUrl, { scroll: false });
        }
      }

      // Use SWR's optimistic update pattern - update immediately, then sync with server
      await mutate(
        async () => {
          // Make API call
          try {
            const result = await triggerSave(updatedNodes);
            return result ?? undefined;
          } catch (error) {
            console.error('Failed to delete node:', error);
            throw error;
          }
        },
        {
          optimisticData: { ...data, nodes: updatedNodes },
          rollbackOnError: true,
          revalidate: false,
        }
      );
    },
    [data, mutate, triggerSave, selectedNodeId, searchParams, pathname, router]
  );

  const saveWorkflowName = React.useCallback(
    async (name: string) => {
      if (!key || !customerId || !workspace) return;
      // Optimistic update
      mutate((prev) => (prev ? { ...prev, name } : prev), { revalidate: false });
      // Persist
      await patchJson(key, { name }, headers);
    },
    [key, mutate, headers, customerId, workspace]
  );

  const activateWorkflow = React.useCallback(async () => {
    if (!key || !customerId || !workspace) return;
    // Optimistic update
    mutate((prev) => (prev ? { ...prev, status: 'active' as const } : prev), { revalidate: false });
    // Persist
    await patchJson(key, { status: 'active' }, headers);
  }, [key, mutate, headers, customerId, workspace]);

  const deactivateWorkflow = React.useCallback(async () => {
    if (!key || !customerId || !workspace) return;
    // Optimistic update
    mutate((prev) => (prev ? { ...prev, status: 'inactive' as const } : prev), { revalidate: false });
    // Persist
    await patchJson(key, { status: 'inactive' }, headers);
  }, [key, mutate, headers, customerId, workspace]);

  const value = React.useMemo<WorkflowContextValue>(
    () => ({
      workflow: data ?? null,
      isLoading,
      error: error as Error | undefined,
      setWorkflow,
      saveNodes,
      saveWorkflowName,
      activateWorkflow,
      deactivateWorkflow,
      nodeTypes: NODE_TYPES,
      triggerTypes: TRIGGER_TYPES,
      refresh: () => mutate(),
      deleteNode,
      selectedNodeId,
      setSelectedNodeId,
    }),
    [
      data,
      isLoading,
      error,
      setWorkflow,
      saveNodes,
      saveWorkflowName,
      activateWorkflow,
      deactivateWorkflow,
      mutate,
      deleteNode,
      selectedNodeId,
      setSelectedNodeId,
    ]
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const ctx = React.useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflow must be used within a WorkflowProvider');
  return ctx;
}


