'use client';

import useSWR from 'swr';
import { useCustomer } from '@/components/providers/customer-provider';
import { getAgentHeaders } from '@/lib/agent-api';

export interface WorkflowSessionItem {
  _id: string;
  sessionId: string;
  workflowId: string;
  customerId: string;
  label: string;
  createdAt: string;
}

interface UseWorkflowSessionsResult {
  sessions: WorkflowSessionItem[];
  isLoading: boolean;
  error: Error | null;
  mutate: () => void;
}

async function fetchWorkflowSessions(
  url: string,
  customerId: string,
  customerName: string | null,
): Promise<WorkflowSessionItem[]> {
  const response = await fetch(url, {
    headers: getAgentHeaders(customerId, customerName),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch workflow sessions');
  }

  const data = await response.json();
  return data.sessions || [];
}

export function useWorkflowSessions(workflowId: string): UseWorkflowSessionsResult {
  const { customerId, customerName } = useCustomer();

  const { data, error, isLoading, mutate } = useSWR<WorkflowSessionItem[]>(
    customerId && workflowId ? [`/api/workflows/${workflowId}/sessions`, customerId, customerName] : null,
    ([url, custId, custName]: [string, string, string | null]) => fetchWorkflowSessions(url, custId, custName),
    {
      revalidateOnFocus: false,
    },
  );

  return {
    sessions: data || [],
    isLoading,
    error: error || null,
    mutate,
  };
}
