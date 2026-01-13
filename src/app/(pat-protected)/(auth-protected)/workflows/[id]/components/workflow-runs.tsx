'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';
import { Minimizer } from '@/components/ui/minimizer';
import { ChevronDown, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ai-elements/loader';
import { useRouter, useSearchParams } from 'next/navigation';

interface WorkflowRunResult {
  nodeId: string;
  nodeName?: string;
  success: boolean;
  message: string;
  input?: unknown;
  output?: unknown;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

interface WorkflowRun {
  _id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  executionTime?: number;
  error?: string;
  results?: WorkflowRunResult[];
  summary?: {
    totalNodes: number;
  };
}

interface WorkflowRunsProps {
  workflowId: string;
  refreshKey?: number;
  expandedRunId?: string;
}

export function WorkflowRuns({ workflowId, refreshKey, expandedRunId }: WorkflowRunsProps) {
  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<string | null>(null);

  const loadRuns = useCallback(async () => {
    if (!customerId || !workspace) return;

    try {
      const response = await fetch(
        `/api/workflows/runs?workflowId=${workflowId}`,
        {
          headers: getAgentHeaders(customerId, customerName),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRuns(data || []);
      }
    } catch (error) {
      console.error('Error loading runs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, customerId, customerName, workspace]);

  useEffect(() => {
    setIsLoading(true);
    loadRuns();
  }, [loadRuns, refreshKey]);

  // Scroll to expanded run when it changes
  useEffect(() => {
    if (!expandedRunId || runs.length === 0) return;
    
    const runExists = runs.some((run) => run._id === expandedRunId);
    if (runExists && scrollRef.current !== expandedRunId) {
      scrollRef.current = expandedRunId;
      setTimeout(() => {
        const element = document.getElementById(`run-${expandedRunId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [expandedRunId, runs]);

  // Poll for updates when there are running workflows
  useEffect(() => {
    const hasRunningRuns = runs.some((run) => run.status === 'running');
    if (!hasRunningRuns) return;

    const interval = setInterval(() => {
      loadRuns();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [runs, loadRuns]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  const formatExecutionTime = (milliseconds?: number) => {
    if (!milliseconds) return null;
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    return `${(milliseconds / 1000).toFixed(2)}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="h-3 w-3 text-white" />
          </div>
        );
      case 'failed':
        return (
          <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
            <X className="h-3 w-3 text-white" />
          </div>
        );
      case 'running':
        return (
          <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
            <Loader2 className="h-3 w-3 text-white animate-spin" />
          </div>
        );
      default:
        return (
          <div className="h-5 w-5 rounded-full bg-gray-500 flex items-center justify-center">
            <Loader2 className="h-3 w-3 text-white" />
          </div>
        );
    }
  };

  const toggleRun = useCallback((runId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const isCurrentlyExpanded = expandedRunId === runId;
    
    if (isCurrentlyExpanded) {
      params.delete('runId');
    } else {
      params.set('runId', runId);
      params.set('tab', 'runs');
    }
    
    router.push(`/workflows/${workflowId}?${params.toString()}`, { scroll: false });
  }, [expandedRunId, searchParams, router, workflowId]);

  const isExpanded = (runId: string) => expandedRunId === runId;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center">
          <Loader size={24} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading runs...</p>
        </div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-muted-foreground">No runs yet</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {runs.map((run, index) => {
          const expanded = isExpanded(run._id);
          const hasResults = run.results && run.results.length > 0;
          const runNumber = runs.length - index;
          const stepCount = run.summary?.totalNodes || run.results?.length || 0;
          const executionTime = run.executionTime;

          return (
            <div key={run._id} id={`run-${run._id}`} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => hasResults && toggleRun(run._id)}
                className={cn(
                  'w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors',
                  !hasResults && 'cursor-default'
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getStatusIcon(run.status)}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-semibold text-foreground mb-1 text-left">
                      Run #{runNumber}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{formatRelativeTime(run.startedAt)}</span>
                      {executionTime && formatExecutionTime(executionTime) && (
                        <>
                          <span>·</span>
                          <span>{formatExecutionTime(executionTime)}</span>
                        </>
                      )}
                      {stepCount > 0 && (
                        <>
                          <span>·</span>
                          <span>{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {hasResults && (
                  <div className="flex-shrink-0 ml-3">
                    <ChevronRight className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      expanded && 'rotate-90'
                    )} />
                  </div>
                )}
              </button>
              {expanded && hasResults && (
                <div className="p-4 bg-muted/30 border-t">
                  <div className="space-y-2">
                    {run.results!.map((result, index) => (
                      <Minimizer
                        key={`${result.nodeId}-${index}`}
                        title={result.nodeName || result.message || `Node ${result.nodeId}`}
                        defaultOpen={false}
                        icon={
                          result.success ? (
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                          )
                        }
                      >
                        <div className="space-y-3">
                          {/* Input - Always show */}
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
                            {result.input !== undefined && result.input !== null ? (
                              <pre className="text-xs bg-background border rounded p-2 overflow-auto max-h-40">
                                {JSON.stringify(result.input, null, 2)}
                              </pre>
                            ) : (
                              <div className="text-xs text-muted-foreground italic p-2 bg-background border rounded">
                                No input data
                              </div>
                            )}
                          </div>
                          {/* Output - Always show */}
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Output</div>
                            {result.output !== undefined && result.output !== null ? (
                              <pre className="text-xs bg-background border rounded p-2 overflow-auto max-h-40">
                                {JSON.stringify(result.output, null, 2)}
                              </pre>
                            ) : (
                              <div className="text-xs text-muted-foreground italic p-2 bg-background border rounded">
                                No output data
                              </div>
                            )}
                          </div>
                          {/* Error - Only show if present */}
                          {result.error && (
                            <div>
                              <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Error</div>
                              <div className="text-xs bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2">
                                <div className="font-medium text-red-800 dark:text-red-200">
                                  {result.error.message}
                                </div>
                                {result.error.code && (
                                  <div className="text-red-600 dark:text-red-400 mt-1">
                                    Code: {result.error.code}
                                  </div>
                                )}
                                {result.error.details !== undefined && result.error.details !== null && (
                                  <pre className="text-xs mt-2 overflow-auto max-h-40">
                                    {JSON.stringify(result.error.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </Minimizer>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
