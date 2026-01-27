'use client';

import { useParams, useRouter } from 'next/navigation';
import { Suspense, useState, useRef, useMemo } from 'react';
import * as React from 'react';
import { Play, ChevronLeft, Check, X, Bot } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DataInput, DataSchema } from '@membranehq/react';
import { PageHeaderActions, PageHeaderLeft } from '@/components/page-header-context';
import { WorkflowEditor, WorkflowEditorRef } from './components/workflow-editor';
import { WorkflowProvider, useWorkflow } from './components/workflow-context';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';
import { useWorkflowSessions } from '@/hooks/use-workflow-sessions';

function WorkflowDetailInner({ id }: { id: string }) {
  const { workflow, isLoading, activateWorkflow, deactivateWorkflow, saveWorkflowName } = useWorkflow();
  const router = useRouter();
  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();
  const [isRunning, setIsRunning] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [triggerInput, setTriggerInput] = useState<Record<string, unknown>>({});
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sessionsPopoverOpen, setSessionsPopoverOpen] = useState(false);
  const workflowEditorRef = useRef<WorkflowEditorRef>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Fetch workflow sessions
  const { sessions, isLoading: sessionsLoading } = useWorkflowSessions(id);

  const triggerNode = workflow?.nodes.find((node) => node.type === 'trigger');
  const hasManualTrigger = triggerNode?.triggerType === 'manual';
  const hasEventTrigger = triggerNode?.triggerType === 'event';
  const manualTriggerNode = hasManualTrigger ? triggerNode : null;

  // Check if the manual trigger has input - must be called before early returns
  const hasInput = useMemo(() => {
    if (!manualTriggerNode) return false;
    return manualTriggerNode.config?.hasInput !== false; // Default to true for backward compatibility
  }, [manualTriggerNode]);

  // Get the input schema from the manual trigger - must be called before early returns
  const triggerInputSchema = useMemo((): DataSchema | null => {
    if (!manualTriggerNode || !hasInput) return null;
    const inputSchema = manualTriggerNode.config?.inputSchema as DataSchema | undefined;
    if (!inputSchema || !inputSchema.properties || Object.keys(inputSchema.properties).length === 0) {
      return null;
    }
    return inputSchema;
  }, [manualTriggerNode, hasInput]);

  // Focus the input when entering edit mode
  React.useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleStartEditing = () => {
    if (workflow) {
      setEditedName(workflow.name);
      setIsEditingName(true);
    }
  };

  const handleCancelEditing = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleSaveNameInline = async () => {
    if (!editedName.trim()) return;
    await saveWorkflowName(editedName.trim());
    setIsEditingName(false);
    setEditedName('');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Workflow not found</h2>
        </div>
      </div>
    );
  }

  const handleRunWorkflow = async (input: Record<string, unknown> = {}) => {
    if (!customerId || !workspace || !id) return;

    setPopoverOpen(false);
    setIsRunning(true);
    try {
      // Switch to runs tab first
      workflowEditorRef.current?.switchToRunsTab();

      // Call the run API
      const response = await fetch(`/api/workflows/${id}/run`, {
        method: 'POST',
        headers: getAgentHeaders(customerId, customerName),
        body: JSON.stringify({ input }),
      });

      if (response.ok) {
        // Refresh the runs list to show the new run
        workflowEditorRef.current?.refreshRuns();
        // Reset input after successful run
        setTriggerInput({});
      } else {
        console.error('Failed to run workflow');
      }
    } catch (error) {
      console.error('Error running workflow:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      {/* Left side: Back button and editable workflow name */}
      <PageHeaderLeft>
        <div className="flex items-center gap-3">
          {/* Back to workflows button */}
          <Button variant="ghost" size="sm" onClick={() => router.push('/workflows')} className="gap-1 px-2">
            <ChevronLeft className="w-4 h-4" />
            Workflows
          </Button>

          {/* Editable workflow name */}
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                ref={nameInputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveNameInline();
                  } else if (e.key === 'Escape') {
                    handleCancelEditing();
                  }
                }}
                className="h-8 w-64 text-sm font-medium"
                placeholder="Workflow name"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSaveNameInline}
                disabled={!editedName.trim()}
                className="h-8 w-8 p-0"
              >
                <Check className="w-4 h-4 text-green-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEditing} className="h-8 w-8 p-0">
                <X className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          ) : (
            <button
              onClick={handleStartEditing}
              className="text-sm font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              title="Click to edit workflow name"
            >
              {workflow.name}
            </button>
          )}
        </div>
      </PageHeaderLeft>

      <PageHeaderActions>
        <div className="flex items-center gap-3">
          {/* Agent sessions dropdown */}
          <Popover open={sessionsPopoverOpen} onOpenChange={setSessionsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost">
                <Bot className="w-4 h-4 mr-2" />
                Agent sessions
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end" side="bottom">
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Agent Sessions</h3>
                {sessionsLoading ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
                ) : sessions.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">No sessions yet</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {sessions.map((session) => (
                      <button
                        key={session._id}
                        onClick={() => {
                          workflowEditorRef.current?.openSession(session.sessionId);
                          setSessionsPopoverOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                      >
                        <div className="text-sm font-medium truncate">{session.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(session.createdAt).toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Active/Inactive toggle - only show for event triggers */}
          {hasEventTrigger && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active</span>
              <Switch
                checked={workflow.status === 'active'}
                onCheckedChange={(checked) => {
                  if (checked) {
                    activateWorkflow();
                  } else {
                    deactivateWorkflow();
                  }
                }}
                className="h-5 w-9 [&>span]:h-4 [&>span]:w-4 [&>span[data-state=checked]]:translate-x-4 [&>span[data-state=unchecked]]:translate-x-0"
              />
            </div>
          )}
          {/* Run button - only show for manual triggers */}
          {hasManualTrigger && (
            <>
              {hasInput && triggerInputSchema ? (
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isRunning}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {isRunning ? 'Running...' : 'Run'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96" align="end" side="bottom" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4 text-green-600" />
                          <h3 className="font-semibold text-sm text-gray-900">Run Workflow</h3>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-4">
                        <div>
                          <DataInput
                            schema={triggerInputSchema}
                            value={triggerInput}
                            variablesSchema={{ type: 'object', properties: {} }}
                            onChange={setTriggerInput}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end pt-2 border-t border-gray-100">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunWorkflow(triggerInput);
                          }}
                          disabled={isRunning}
                          className="text-white px-4 rounded-full"
                        >
                          <div className="flex items-center gap-2">
                            {isRunning ? (
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            Run Workflow
                          </div>
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Button onClick={() => handleRunWorkflow()} size="sm" variant="ghost" disabled={isRunning}>
                  <Play className="w-4 h-4 mr-2" />
                  {isRunning ? 'Running...' : 'Run'}
                </Button>
              )}
            </>
          )}
        </div>
      </PageHeaderActions>

      <WorkflowEditor ref={workflowEditorRef} workflowId={id} />
    </>
  );
}

export default function WorkflowDetailPage() {
  const { id } = useParams();

  const resolvedId = Array.isArray(id) ? id[0] : (id as string);

  if (!resolvedId) return null;
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full">
          <div className="border-b border-gray-200 dark:border-gray-800 py-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      }
    >
      <WorkflowProvider id={resolvedId}>
        <WorkflowDetailInner id={resolvedId} />
      </WorkflowProvider>
    </Suspense>
  );
}
